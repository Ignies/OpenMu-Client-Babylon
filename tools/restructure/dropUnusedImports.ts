// Removes import specifiers tsc reports as unused (TS6133), and whole declarations it reports as
// unused (TS6192), only inside the given folders.
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
const inScope = (file: string) => dirs.some(d => file.startsWith(d)) && !/Packets.ts$/.test(file); // generated files are the generator's
const hits = new Map<string, Set<string>>();
const wholeLines = new Map<string, Set<number>>();
for (const m of out.matchAll(/^(.+?)\((\d+),(\d+)\): error TS6133: '([^']+)'/gm)) {
  const [, file, , , name] = m;
  if (!inScope(file)) continue;
  hits.set(file, (hits.get(file) ?? new Set()).add(name));
}
for (const m of out.matchAll(/^(.+?)\((\d+),(\d+)\): error TS6192:/gm)) {
  const [, file, line] = m;
  if (!inScope(file)) continue;
  wholeLines.set(file, (wholeLines.get(file) ?? new Set()).add(Number(line)));
  if (!hits.has(file)) hits.set(file, new Set());
}
let removed = 0;
for (const [file, names] of hits) {
  const raw = readFileSync(file, 'utf8');
  const text = raw.replace(/\r\n/g, '\n');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits: [number, number, string][] = [];
  const lineEnd = (at: number) => (text[at] === '\n' ? at + 1 : at);
  for (const s of sf.statements) {
    if (!ts.isImportDeclaration(s)) continue;
    if (wholeLines.get(file)?.has(sf.getLineAndCharacterOfPosition(s.getStart(sf)).line + 1)) {
      removed++;
      edits.push([s.getStart(sf), lineEnd(s.getEnd()), '']);
      continue;
    }
    if (!s.importClause?.namedBindings || !ts.isNamedImports(s.importClause.namedBindings) || s.importClause.name) continue;
    const els = s.importClause.namedBindings.elements;
    const keep = els.filter(e => !names.has(e.name.text));
    if (keep.length === els.length) continue;
    removed += els.length - keep.length;
    const spec = s.moduleSpecifier.getText(sf);
    const typeOnly = s.importClause.isTypeOnly ? 'type ' : '';
    if (keep.length) edits.push([s.getStart(sf), s.getEnd(), `import ${typeOnly}{ ${keep.map(e => e.getText(sf)).join(', ')} } from ${spec};`]);
    else edits.push([s.getStart(sf), lineEnd(s.getEnd()), '']);
  }
  let t = text;
  for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) t = t.slice(0, a) + r + t.slice(b);
  t = t.replace(/^\n+/, '');
  writeFileSync(file, raw.includes('\r\n') ? t.replace(/\n/g, '\r\n') : t);
}
console.log(`removed ${removed} unused imports in ${hits.size} files`);
