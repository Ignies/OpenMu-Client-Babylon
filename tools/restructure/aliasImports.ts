// Rewrites long relative imports (crossing src/ <-> versions/, or 3+ levels up)
// to the @/ and @versions/ aliases. Usage: bun tools/restructure/aliasImports.ts [--dry-run]
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { posix } from 'path';
import { specifiers } from './plan';

const GENERATED = /^versions\/shared\/packets\/\w+Packets\.ts$/;
const dry = process.argv.includes('--dry-run');
const files = execSync('git ls-files -co --exclude-standard src versions', { encoding: 'utf8' })
  .split('\n')
  .filter(f => /\.(ts|tsx)$/.test(f) && !GENERATED.test(f));

const root = (p: string) => (p.startsWith('src/') ? 'src' : p.startsWith('versions/') ? 'versions' : '');
const alias = (target: string) => (target.startsWith('src/') ? '@/' + target.slice(4) : '@versions/' + target.slice(9));

export function aliased(file: string, spec: string): string | null {
  if (!spec.startsWith('../')) return null;
  const target = posix.normalize(posix.join(posix.dirname(file), spec));
  const tr = root(target);
  if (!tr) return null;
  const crosses = tr !== root(file);
  const deep = spec.startsWith('../../../');
  return crosses || deep ? alias(target) : null;
}

let changed = 0;
let edits = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  let text = raw;
  const specs = specifiers(f, text).sort((a, b) => b.start - a.start);
  for (const s of specs) {
    const next = aliased(f, s.spec);
    if (!next) continue;
    text = text.slice(0, s.start) + next + text.slice(s.end);
    edits++;
  }
  if (text !== raw) {
    changed++;
    if (!dry) writeFileSync(f, text);
  }
}
console.log(`${edits} imports in ${changed} files${dry ? ' (dry run)' : ''}`);
