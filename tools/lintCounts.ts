// `bun run lint:count` — reads ESLint's JSON formatter output from stdin and
// prints a count per rule (most frequent first), plus the file total. Used
// to report lint health without touching any code.
const text = await Bun.stdin.text();
const start = text.indexOf('[');
const results = JSON.parse(text.slice(start)) as {
  filePath: string;
  messages: { ruleId: string | null; severity: number }[];
}[];

const byRule = new Map<string, { errors: number; warnings: number }>();
let files = 0;
for (const file of results) {
  if (file.messages.length) files++;
  for (const m of file.messages) {
    const key = m.ruleId ?? '(parse error)';
    const row = byRule.get(key) ?? { errors: 0, warnings: 0 };
    if (m.severity === 2) row.errors++;
    else row.warnings++;
    byRule.set(key, row);
  }
}

const rows = [...byRule.entries()].sort(
  (a, b) => b[1].errors + b[1].warnings - (a[1].errors + a[1].warnings)
);
let totalE = 0;
let totalW = 0;
console.log('| Rule | Errors | Warnings |');
console.log('|---|---|---|');
for (const [rule, { errors, warnings }] of rows) {
  totalE += errors;
  totalW += warnings;
  console.log(`| ${rule} | ${errors} | ${warnings} |`);
}
console.log(`| **total** (${files} files) | ${totalE} | ${totalW} |`);
