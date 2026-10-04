// Merges the named imports a file takes from one module into one statement, where an earlier codemod
// left one per old path. The merged statement takes the first one's place, so load order is unchanged.
// Usage: bun tools/restructure/mergeImports.ts [file...]   (no files: every changed .ts/.tsx per git)
import ts from 'typescript';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : execSync('git diff --name-only HEAD', { encoding: 'utf8' })
        .split('\n')
        .filter(f => /\.tsx?$/.test(f) && existsSync(f));

/** The statement the way prettier prints it at width 80. */
function render(names: string[], spec: string, typeOnly: boolean): string {
  const head = `import ${typeOnly ? 'type ' : ''}`;
  const line = `${head}{ ${names.join(', ')} } from '${spec}';`;
  return line.length <= 80 ? line : `${head}{\n${names.map(n => `  ${n},`).join('\n')}\n} from '${spec}';`;
}

let merged = 0;
for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const text = raw.replace(/\r\n/g, '\n');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  type Found = { st: ts.ImportDeclaration; names: string[]; spec: string };
  const groups = new Map<string, Found[]>();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const clause = st.importClause;
    if (!clause || clause.name || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    const key = `${clause.isTypeOnly ? 'type ' : ''}${st.moduleSpecifier.text}`;
    const found = { st, names: clause.namedBindings.elements.map(e => e.getText(sf)), spec: st.moduleSpecifier.text };
    groups.set(key, [...(groups.get(key) ?? []), found]);
  }
  const edits: [number, number, string][] = [];
  for (const [key, found] of groups) {
    const decls = found.map(f => f.st);
    // A comment on an import belongs to it: leave such a group alone.
    if (decls.length < 2 || decls.some(d => /\/[/*]/.test(text.slice(d.getFullStart(), d.getStart(sf))))) continue;
    const names = [...new Set(found.flatMap(f => f.names))];
    edits.push([decls[0].getStart(sf), decls[0].getEnd(), render(names, found[0].spec, key.startsWith('type '))]);
    for (const d of decls.slice(1)) edits.push([d.getFullStart(), d.getEnd(), '']);
    merged += decls.length - 1;
  }
  if (!edits.length) continue;
  let out = text;
  for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + r + out.slice(b);
  writeFileSync(file, raw.includes('\r\n') ? out.replace(/\n/g, '\r\n') : out);
}
console.log(`${merged} duplicate imports merged`);
