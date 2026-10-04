// Usage: bun tools/restructure/move.ts <moves.json> [--dry-run]
// See docs/how_to/move_files.md.
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { planMoves, type Move } from './plan';

const CODE = /\.(ts|tsx|js|mjs)$/;
const SKIP = /^(Data|Data-v097d|public|node_modules|dist)\//;
const CONFIGS = ['vite.config.ts', 'register/vite.config.ts', 'eslint.config.js', 'package.json', 'tsconfig.json', 'index.html', 'marketplace.html', '.prettierignore', '.gitignore'];

const [movesFile, ...flags] = process.argv.slice(2);
if (!movesFile) throw new Error('usage: move.ts <moves.json> [--dry-run]');
const dry = flags.includes('--dry-run');
const moves: Move[] = JSON.parse(readFileSync(movesFile, 'utf8'));

const files = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\n')
  .filter(f => f && !SKIP.test(f) && existsSync(f));
const tree = new Map(files.map(f => [f, CODE.test(f) ? readFileSync(f, 'utf8') : null] as const));
const plan = planMoves(tree, moves);

console.log(`${plan.renames.length} files move, ${plan.writes.size} files written`);
if (plan.unresolved.length) console.log(`unresolved relative imports (pre-existing or dynamic):\n  ${plan.unresolved.join('\n  ')}`);

// Plain-text mentions the planner cannot rewrite: configs, regexes, docs.
const mentions: string[] = [];
for (const cfg of CONFIGS.filter(existsSync)) {
  const text = readFileSync(cfg, 'utf8');
  for (const { from } of moves) if (text.includes(from)) mentions.push(`${cfg}: ${from}`);
}
if (mentions.length) console.log(`fix by hand:\n  ${mentions.join('\n  ')}`);
if (dry) process.exit(0);

for (const [from, to] of plan.renames) {
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
}
for (const [path, text] of plan.writes) writeFileSync(path, text);
