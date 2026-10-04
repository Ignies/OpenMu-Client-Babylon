// Structure checks. `bun run check` runs them; `bun run check --update` rewrites
// the baselines, which may only shrink (CI compares against the base branch).
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { cycles, importGraph, runtimeSpecifiers, trackedFiles } from './graph';
import { RULES, edgeKey } from './rules';

const update = process.argv.includes('--update');
const BASE = 'tools/checks/baselines';
const failures: string[] = [];
const fail = (check: string, lines: string[]) => lines.length && failures.push(`${check}:\n  ${lines.slice(0, 40).join('\n  ')}${lines.length > 40 ? `\n  ... ${lines.length - 40} more` : ''}`);

function baseline(name: string, current: string[]): string[] {
  const path = `${BASE}/${name}.json`;
  const allowed: string[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  if (update) {
    const kept = current.filter(c => allowed.includes(c) || !existsSync(path)).sort();
    writeFileSync(path, JSON.stringify(kept, null, 1) + '\n');
    return [];
  }
  const fixed = allowed.filter(a => !current.includes(a));
  if (fixed.length) console.log(`${name}: ${fixed.length} baseline entries are fixed; run \`bun run check --update\` to drop them`);
  return current.filter(c => !allowed.includes(c));
}

// 1. No em-dashes (data files excluded: game text and generated packets).
{
  const DATA = /(^tools\/packs\/|Packets\.ts$|\.json$)/;
  const files = trackedFiles(['src', 'versions', 'tools', 'docs', '.github', '*.md']).filter(f => /\.(ts|tsx|less|md|yml)$/.test(f) && !DATA.test(f));
  const EM_DASH = String.fromCharCode(0x2014);
  fail('em-dash (use -)', files.filter(f => readFileSync(f, 'utf8').includes(EM_DASH)));
}

// 2. Every module folder explains itself.
{
  const dirs = (p: string) => (existsSync(p) ? readdirSync(p).filter(d => statSync(`${p}/${d}`).isDirectory() && !d.startsWith('_') && d !== '__snapshots__').map(d => `${p}/${d}`) : []);
  const folders = [
    'src/app', 'src/core', 'src/ecs', 'src/version', 'src/i18n', 'src/controllers', 'src/modules', 'versions', 'versions/shared',
    ...dirs('src/controllers'), ...dirs('src/modules'), ...dirs('versions/shared'), ...dirs('versions').filter(d => d !== 'versions/shared'),
    ...dirs('versions/shared/skills'), ...dirs('versions/shared/ui'),
  ];
  fail('readme.md missing', baseline('missing_readmes', folders.filter(d => !existsSync(`${d}/readme.md`))));
}

// 3. Doc names: lowercase snake_case.
{
  const ALLOWED = new Set(['README.md', 'AGENTS.md', 'CLAUDE.md']);
  const docs = trackedFiles(['docs', 'src', 'versions', 'tools']).filter(f => f.endsWith('.md'));
  fail('doc names must be snake_case', docs.filter(f => { const n = f.split('/').pop()!; return !ALLOWED.has(n) && !/^[a-z0-9_]+\.md$/.test(n); }));
}

// 4. Dependency direction.
{
  const edges = importGraph();
  const hits = RULES.flatMap(r => edges.filter(r.test).map(e => edgeKey(r.name, e)));
  const fresh = baseline('deps', [...new Set(hits)].sort());
  fail('dependency rules (see tools/checks/rules.ts)', fresh);
}

// 5. Server processes never load client code: the game-version layer, Babylon or React.
{
  const SERVERS = ['proxy/main.ts', 'register/server/main.ts', 'register/server/accountsCli.ts', 'cashshop/server/main.ts', 'marketplace/server/main.ts', 'ops/server/opsCli.ts'];
  // `src/version/index.ts` holds `gameVersion`, which only a browser boot fills in (contract.ts is plain types).
  const CLIENT_FILE = /^src\/(version\/index\.ts|app\/)/;
  const CLIENT_PACKAGE = /^(@babylonjs\/|react|mobx-react)/;
  const edges = importGraph(['src', 'versions', 'proxy', 'register/server', 'cashshop/server', 'marketplace/server', 'ops/server', 'tools'], runtimeSpecifiers);
  const next = new Map<string, string[]>();
  for (const e of edges) (next.get(e.from) ?? next.set(e.from, []).get(e.from)!).push(e.to);
  const bad: string[] = [];
  for (const entry of SERVERS) {
    const seen = new Set([entry]);
    const queue = [entry];
    while (queue.length) {
      const f = queue.shift()!;
      if (CLIENT_FILE.test(f)) bad.push(`${entry} reaches ${f}`);
      const bare = runtimeSpecifiers(f, readFileSync(f, 'utf8')).filter(s => CLIENT_PACKAGE.test(s));
      for (const s of bare) bad.push(`${entry} reaches ${s} (via ${f})`);
      for (const to of next.get(f) ?? []) {
        if (seen.has(to)) continue;
        seen.add(to);
        queue.push(to);
      }
    }
  }
  fail('server code loads client code', [...new Set(bad)]);
}

// 6. A controller's public files are the ones at its root and the index.ts of each of its folders; the rest
//    of a subfolder is private to the controller (docs/controllers.md, "Public files").
{
  const EXEMPT = /^src\/controllers\/render\/babylon\/|\/scenes\/testScene\.ts$/;
  const isPublic = (to: string) => /^src\/controllers\/[^/]+\/[^/]+$/.test(to) || /\/index\.tsx?$/.test(to);
  const inner = (from: string, to: string) => {
    const m = to.match(/^src\/controllers\/([^/]+)\//);
    return !!m && !from.startsWith(`src/controllers/${m[1]}/`) && !isPublic(to) && !EXEMPT.test(to) && !/\.test\.tsx?$/.test(from);
  };
  const hits = importGraph().filter(e => inner(e.from, e.to)).map(e => `${e.from} -> ${e.to}`);
  fail('controller subfolder internals used from outside (import its folder index.ts)', baseline('controller_api', [...new Set(hits)].sort()));
}

// 7. No new import cycles: a cycle makes load order matter (a class used before its file ran). Listed by the
//    imports that close one; type-only imports and tests do not count.
{
  const edges = importGraph(['src', 'versions'], runtimeSpecifiers).filter(e => !/\.test\.tsx?$/.test(e.from));
  const inCycle = new Map<string, number>();
  cycles(edges).forEach((group, i) => group.forEach(f => inCycle.set(f, i)));
  const closing = edges.filter(e => inCycle.has(e.from) && inCycle.get(e.from) === inCycle.get(e.to));
  fail('import cycles (break the cycle; see docs/guidelines/code_style.md)', baseline('cycles', [...new Set(closing.map(e => `${e.from} -> ${e.to}`))].sort()));
}

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}
console.log(update ? 'baselines updated' : 'structure checks passed');
