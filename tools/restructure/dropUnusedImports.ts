// Removes import specifiers tsc reports as unused (TS6133), only inside the given folders.
// Usage: bun tools/restructure/dropUnusedImports.ts <dir> [<dir>...]
import ts from 'typescript';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const dirs = process.argv.slice(2);
let out = '';
try {
  execSync('bunx tsc --noEmit --noUnusedLocals', { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  out = String((e as { stdout?: string }).stdout ?? '');
}
const hits = new Map<string, Set<string>>();
for (const m of out.matchAll(/^(.+?)\((\d+),(\d+)\): error TS6133: '([^']+)'/gm)) {
  const [, file, , , name] = m;
  if (!dirs.some(d => file.startsWith(d))) continue;
  (hits.get(file) ?? hits.set(file, new Set()).get(file)!).add(name);
}
let removed = 0;
for (const [file, names] of hits) {
  const raw = readFileSync(file, 'utf8');
  const text = raw.replace(/\r\n/g, '\n');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits: [number, number, string][] = [];
  for (const s of sf.statements) {
    if (!ts.isImportDeclaration(s) || !s.importClause?.namedBindings || !ts.isNamedImports(s.importClause.namedBindings) || s.importClause.name) continue;
    const els = s.importClause.namedBindings.elements;
    const keep = els.filter(e => !names.has(e.name.text));
    if (keep.length === els.length) continue;
    removed += els.length - keep.length;
    const spec = s.moduleSpecifier.getText(sf);
    const typeOnly = s.importClause.isTypeOnly ? 'type ' : '';
    edits.push([s.getStart(sf), s.getEnd(), keep.length ? `import ${typeOnly}{ ${keep.map(e => e.getText(sf)).join(', ')} } from ${spec};` : '']);
  }
  let t = text;
  for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) t = t.slice(0, a) + r + t.slice(b);
  t = t.replace(/^\n+/, '');
  writeFileSync(file, raw.includes('\r\n') ? t.replace(/\n/g, '\r\n') : t);
}
console.log(`removed ${removed} unused imports in ${hits.size} files`);
