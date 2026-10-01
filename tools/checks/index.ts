// Structure checks. `bun run check` runs them; `bun run check --update` rewrites
// the baselines, which may only shrink (CI compares against the base branch).
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { importGraph, trackedFiles } from './graph';
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
    'src/app', 'src/core', 'src/ecs', 'src/version', 'src/i18n', 'src/controllers', 'src/features', 'versions', 'versions/shared',
    ...dirs('src/controllers'), ...dirs('src/features'), ...dirs('versions/shared'), ...dirs('versions').filter(d => d !== 'versions/shared'),
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

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}
console.log(update ? 'baselines updated' : 'structure checks passed');
