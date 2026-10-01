// Proves that working-tree edits to .ts/.tsx files changed comments only:
// each changed file, printed without comments, must equal its HEAD version.
// Usage: bun tools/restructure/commentsOnly.ts [ref=HEAD]
import ts from 'typescript';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const ref = process.argv[2] ?? 'HEAD';
const changed = execSync(`git diff --name-only ${ref} -- "*.ts" "*.tsx"`, { encoding: 'utf8' }).split('\n').filter(Boolean);
const printer = ts.createPrinter({ removeComments: true });
// Line endings are normalized: a CRLF checkout changes multi-line strings, not code.
const strip = (file: string, text: string) =>
  printer.printFile(ts.createSourceFile(file, text.replace(/\r\n/g, '\n'), ts.ScriptTarget.Latest, false, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));

const bad: string[] = [];
for (const f of changed) {
  let before = '';
  try {
    before = execSync(`git show ${ref}:${f}`, { encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    bad.push(`${f} (new file)`);
    continue;
  }
  if (strip(f, before) !== strip(f, readFileSync(f, 'utf8'))) bad.push(f);
}
console.log(`${changed.length} changed source files, ${bad.length} with code changes`);
if (bad.length) {
  console.log(bad.join('\n'));
  process.exit(1);
}
