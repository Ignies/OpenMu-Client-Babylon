// Deletes exported declarations listed as "<file>\t<name>" lines (from tools/checks/unusedExports.ts).
// Usage: bun tools/restructure/deleteDeadExports.ts <list.txt>
import ts from 'typescript';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';

const list = readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t'));
const byFile = new Map<string, Set<string>>();
for (const [file, name] of list) (byFile.get(file) ?? byFile.set(file, new Set()).get(file)!).add(name);

let removed = 0;
for (const [file, names] of byFile) {
  const raw = readFileSync(file, 'utf8');
  const nl = raw.includes('\r\n') ? '\r\n' : '\n';
  const text = raw.replace(/\r\n/g, '\n');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits: [number, number, string][] = [];
  for (const s of sf.statements) {
    if (ts.isVariableStatement(s)) {
      const decls = s.declarationList.declarations;
      const dead = decls.filter(d => ts.isIdentifier(d.name) && names.has(d.name.text));
      if (!dead.length) continue;
      removed += dead.length;
      if (dead.length === decls.length) edits.push([s.getFullStart(), s.getEnd(), '']);
      else for (const d of dead) edits.push([d.getFullStart(), d.getEnd() + (text[d.getEnd()] === ',' ? 1 : 0), '']);
    } else if ((ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isEnumDeclaration(s)) && s.name && names.has(s.name.text)) {
      removed++;
      edits.push([s.getFullStart(), s.getEnd(), '']);
    }
  }
  let t = text;
  for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) t = t.slice(0, a) + r + t.slice(b);
  t = t.replace(/\n{3,}/g, '\n\n');
  // A file left with nothing but imports and comments goes away.
  const rest = ts.createSourceFile(file, t, ts.ScriptTarget.Latest, false).statements.filter(s => !ts.isImportDeclaration(s));
  if (rest.length === 0) {
    unlinkSync(file);
    console.log(`deleted file ${file}`);
    continue;
  }
  writeFileSync(file, t.replace(/\n/g, nl));
}
console.log(`removed ${removed} declarations in ${byFile.size} files`);
