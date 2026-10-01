// ESLint ratchet: per-rule problem counts may go down, never up.
// Usage: eslint . -f json | bun tools/checks/lintRatchet.ts [--update]
import { existsSync, readFileSync, writeFileSync } from 'fs';

const PATH = 'tools/checks/baselines/lint.json';
const text = await Bun.stdin.text();
const results = JSON.parse(text.slice(text.indexOf('['))) as { messages: { ruleId: string | null }[] }[];

const counts: Record<string, number> = {};
for (const r of results) for (const m of r.messages) counts[m.ruleId ?? '(parse error)'] = (counts[m.ruleId ?? '(parse error)'] ?? 0) + 1;

if (process.argv.includes('--update') || !existsSync(PATH)) {
  writeFileSync(PATH, JSON.stringify(Object.fromEntries(Object.entries(counts).sort()), null, 1) + '\n');
  console.log('lint baseline written');
  process.exit(0);
}

const base: Record<string, number> = JSON.parse(readFileSync(PATH, 'utf8'));
const worse = Object.entries(counts).filter(([rule, n]) => n > (base[rule] ?? 0));
const better = Object.entries(base).filter(([rule, n]) => (counts[rule] ?? 0) < n);
for (const [rule, n] of better) console.log(`${rule}: ${n} -> ${counts[rule] ?? 0} (run with --update to lock it in)`);
if (worse.length) {
  console.error('lint got worse:\n' + worse.map(([rule, n]) => `  ${rule}: ${base[rule] ?? 0} -> ${n}`).join('\n'));
  process.exit(1);
}
console.log('lint ratchet passed');
