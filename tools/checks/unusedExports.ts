// Lists exported names that no other file mentions (a word-level search, so a hit is a strong
// hint, not proof: check dynamic access and window hooks before deleting).
// Usage: bun tools/checks/unusedExports.ts [path-prefix]
import ts from 'typescript';
import { readFileSync } from 'fs';
import { trackedFiles } from './graph';

const prefix = process.argv[2] ?? '';
const files = trackedFiles(['src', 'versions', 'tools', 'proxy', 'cashshop', 'marketplace', 'register', 'ops']).filter(f => /\.(ts|tsx)$/.test(f));
const texts = new Map(files.map(f => [f, readFileSync(f, 'utf8')]));

const words = new Map<string, Set<string>>();
for (const [f, t] of texts) for (const w of new Set(t.match(/[A-Za-z_$][\w$]*/g) ?? [])) (words.get(w) ?? words.set(w, new Set()).get(w)!).add(f);

const out: string[] = [];
for (const [f, t] of texts) {
  if (!f.startsWith(prefix) || /\.test\.tsx?$|Packets\.ts$/.test(f)) continue;
  const sf = ts.createSourceFile(f, t, ts.ScriptTarget.Latest, false);
  for (const s of sf.statements) {
    if (!ts.getModifiers(s as ts.HasModifiers)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    const names = ts.isVariableStatement(s)
      ? s.declarationList.declarations.flatMap(d => (ts.isIdentifier(d.name) ? [d.name.text] : []))
      : (s as unknown as { name?: ts.Identifier }).name ? [(s as unknown as { name: ts.Identifier }).name.text] : [];
    for (const n of names) {
      const users = words.get(n) ?? new Set();
      const outside = [...users].filter(u => u !== f);
      if (outside.length === 0) {
        const own = (t.match(new RegExp(`\\b${n.replace(/\$/g, '\\$')}\\b`, 'g')) ?? []).length;
        out.push(`${f}\t${n}\t${own > 1 ? 'used in its file' : 'unused'}`);
      }
    }
  }
}
console.log(out.join('\n'));
console.log(`${out.length} exports with no outside mention`);
