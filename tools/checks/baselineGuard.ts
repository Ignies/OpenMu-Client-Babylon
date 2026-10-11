// A pull request may shrink a baseline, never grow it.
// Usage: bun tools/checks/baselineGuard.ts <base-ref>
import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';

const base = process.argv[2] ?? 'origin/main';
const DIR = 'tools/checks/baselines';
const problems: string[] = [];
for (const file of readdirSync(DIR).filter(f => f.endsWith('.json'))) {
  const path = `${DIR}/${file}`;
  let before: unknown;
  try {
    before = JSON.parse(execSync(`git show ${base}:${path}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    continue; // new baseline on this branch
  }
  const after: unknown = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  if (Array.isArray(before) && Array.isArray(after)) {
    for (const entry of after) if (!before.includes(entry)) problems.push(`${file}: added "${entry}"`);
  } else {
    const b = before as Record<string, number>;
    for (const [k, n] of Object.entries(after as Record<string, number>)) if (n > (b[k] ?? 0)) problems.push(`${file}: ${k} ${b[k] ?? 0} -> ${n}`);
  }
}
if (problems.length) {
  console.error('baselines may only shrink:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('baselines did not grow');
