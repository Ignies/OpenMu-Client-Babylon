// Commit message rules for a pull request: bun tools/checks/commits.ts <base-ref>
import { execSync } from 'child_process';

const base = process.argv[2] ?? 'origin/main';
const log = execSync(`git log --format=%H%x1f%B%x1e ${base}..HEAD`, { encoding: 'utf8' });
const EM_DASH = String.fromCharCode(0x2014);
const problems: string[] = [];
for (const entry of log.split('\x1e').map(s => s.trim()).filter(Boolean)) {
  const [hash, body] = entry.split('\x1f');
  const subject = body.split('\n')[0];
  // GitHub's own test merge of a pull request (refs/pull/N/merge) is not ours to word.
  if (/^Merge [0-9a-f]{40} into [0-9a-f]{40}$/.test(subject)) continue;
  const where = `${hash.slice(0, 8)} "${subject}"`;
  if (subject.length > 72) problems.push(`${where}: subject longer than 72 characters`);
  if (body.includes(EM_DASH)) problems.push(`${where}: em-dash, use -`);
  if (/co-authored-by|generated with|claude|\bai\b-generated/i.test(body)) problems.push(`${where}: no AI attribution in commits`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('commit messages passed');
