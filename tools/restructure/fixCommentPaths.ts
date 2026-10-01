// Rewrites old paths inside comments using the move maps in tools/restructure/moves/.
// `common/itemMaterial.ts` -> `controllers/item_fx/itemMaterial.ts`, `effects/blur.ts` ->
// `controllers/fx/blur.ts`. Only comments change, and only text that looks like a path: it has
// a slash in it or ends in .ts/.tsx. Usage: bun tools/restructure/fixCommentPaths.ts [--dry-run]
import ts from 'typescript';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { trackedFiles } from '../checks/graph';

const dry = process.argv.includes('--dry-run');
const MOVES = 'tools/restructure/moves';
type Move = { from: string; to: string };
const moves: Move[] = readdirSync(MOVES).flatMap(f => JSON.parse(readFileSync(`${MOVES}/${f}`, 'utf8')) as Move[]);
moves.push(
  { from: 'src/common/skillVisuals.ts', to: 'src/controllers/skills/visuals.ts' },
  { from: 'src/maps', to: 'versions/shared/maps' },
  { from: 'src/ui/components', to: 'src/controllers/interface/components' },
  { from: 'src/ui/pages/worldPage/components', to: 'versions/shared/ui/windows' },
  { from: 'src/ui/pages', to: 'versions/shared/ui/pages' },
);

const strip = (p: string) => p.replace(/^src\//, '');
const noExt = (p: string) => p.replace(/\.tsx?$/, '');
const lookup = new Map<string, string>();
for (const m of moves) {
  if (m.from === m.to) continue;
  lookup.set(noExt(m.from), noExt(strip(m.to)));
  if (m.from.startsWith('src/')) lookup.set(noExt(strip(m.from)), noExt(strip(m.to)));
}
const keys = [...lookup.keys()].sort((a, b) => b.length - a.length);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(`(^|[^\\w/.@-])(${keys.map(esc).join('|')})(\\.tsx?\\b|/[\\w.*<>-]|(?=[^\\w/-]|$))`, 'g');

/** Every comment range in the file, from the syntax tree (so nothing inside strings or templates). */
function commentRanges(sf: ts.SourceFile): [number, number][] {
  const seen = new Set<number>();
  const out: [number, number][] = [];
  const add = (list: readonly ts.CommentRange[] | undefined) => {
    for (const c of list ?? []) if (!seen.has(c.pos)) { seen.add(c.pos); out.push([c.pos, c.end]); }
  };
  const visit = (n: ts.Node): void => {
    add(ts.getLeadingCommentRanges(sf.text, n.pos));
    add(ts.getTrailingCommentRanges(sf.text, n.end));
    ts.forEachChild(n, visit);
  };
  visit(sf);
  add(ts.getLeadingCommentRanges(sf.text, sf.endOfFileToken.pos));
  return out.sort((a, b) => b[0] - a[0]);
}

let files = 0;
let hits = 0;
for (const file of trackedFiles(['src', 'versions']).filter(f => /\.tsx?$/.test(f) && !/Packets\.ts$/.test(f))) {
  const raw = readFileSync(file, 'utf8');
  const text = raw.replace(/\r\n/g, '\n');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let t = text;
  let n = 0;
  for (const [a, b] of commentRanges(sf)) {
    const before = t.slice(a, b);
    const after = before.replace(re, (m, pre: string, path: string, tail: string) => {
      // A bare word is only a path when it has a slash or an extension.
      if (!path.includes('/') && !tail) return m;
      n++;
      return pre + lookup.get(path) + tail;
    });
    if (after !== before) t = t.slice(0, a) + after + t.slice(b);
  }
  if (n) {
    files++;
    hits += n;
    if (!dry) writeFileSync(file, raw.includes('\r\n') ? t.replace(/\n/g, '\r\n') : t);
  }
}
console.log(`${hits} paths in ${files} files${dry ? ' (dry run)' : ''}`);
