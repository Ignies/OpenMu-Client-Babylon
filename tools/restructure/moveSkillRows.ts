// Moves one per-skill table out of a controller into the skill folders, as a
// `defineSkill` property, with the helpers only those rows use. The table stays
// behind empty and `registerSkills` fills it.
// Usage: bun tools/restructure/moveSkillRows.ts <source.ts> <TABLE> <property> [--dry-run]
import ts from 'typescript';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, posix } from 'path';
import { hasHome, skillHome } from './skillHomes';

const [SRC, TABLE, PROP] = process.argv.slice(2);
const dry = process.argv.includes('--dry-run');
const ROOT = 'versions/shared/skills';
const GLOBAL_SHARED = `${ROOT}/_shared.ts`;
if (!SRC || !TABLE || !PROP) throw new Error('usage: moveSkillRows.ts <source.ts> <TABLE> <property>');

const read = (f: string) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const nlOf = (f: string) => (existsSync(f) && readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n');

// ---- AST helpers -------------------------------------------------------------
function isDeclName(n: ts.Identifier): boolean {
  const p = n.parent;
  if (ts.isPropertyAccessExpression(p) && p.name === n) return true;
  if (ts.isQualifiedName(p) && p.right === n) return true;
  if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isMethodSignature(p) || ts.isEnumMember(p)) && p.name === n) return true;
  if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isClassDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isTypeParameterDeclaration(p) || ts.isEnumDeclaration(p)) && p.name === n) return true;
  if (ts.isBindingElement(p) && (p.name === n || p.propertyName === n)) return true;
  if (ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isExportSpecifier(p)) return true;
  return false;
}
function refsOf(node: ts.Node): Set<string> {
  const out = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && !isDeclName(n)) out.add(n.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}
function names(s: ts.Statement): string[] {
  if (ts.isVariableStatement(s)) return s.declarationList.declarations.flatMap(d => (ts.isIdentifier(d.name) ? [d.name.text] : []));
  if ((ts.isFunctionDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isEnumDeclaration(s) || ts.isClassDeclaration(s)) && s.name) return [s.name.text];
  return [];
}
type Binding = { spec: string; name: string; alias: string; typeOnly: boolean };
function importsOf(sf: ts.SourceFile): Map<string, Binding> {
  const m = new Map<string, Binding>();
  for (const s of sf.statements) {
    if (!ts.isImportDeclaration(s) || !s.importClause) continue;
    const spec = (s.moduleSpecifier as ts.StringLiteral).text;
    const c = s.importClause;
    if (c.name) m.set(c.name.text, { spec, name: 'default', alias: c.name.text, typeOnly: c.isTypeOnly });
    const nb = c.namedBindings;
    if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) m.set(e.name.text, { spec, name: (e.propertyName ?? e.name).text, alias: e.name.text, typeOnly: c.isTypeOnly || e.isTypeOnly });
    if (nb && ts.isNamespaceImport(nb)) m.set(nb.name.text, { spec, name: '*', alias: nb.name.text, typeOnly: c.isTypeOnly });
  }
  return m;
}
const resolveSpec = (from: string, spec: string) => (spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(from), spec)) : spec.startsWith('@/') ? 'src/' + spec.slice(2) : spec);
function specFrom(fromModule: string, target: string): string {
  if (!target.startsWith('src/') && !target.startsWith('versions/') && !target.startsWith('.')) return target; // package
  const noExt = target.replace(/\.tsx?$/, '').replace(/\/index$/, '');
  if (noExt.startsWith('src/')) return '@/' + noExt.slice(4);
  const r = posix.relative(posix.dirname(fromModule), noExt);
  return r.startsWith('.') ? r : './' + r;
}

// ---- source ------------------------------------------------------------------------
const text = read(SRC);
const sf = ts.createSourceFile(SRC, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const srcImports = importsOf(sf);
type Unit = { names: string[]; stmt: ts.Statement; refs: Set<string>; target?: string };
const units: Unit[] = [];
const byName = new Map<string, Unit>();
type Row = { key: number; text: string; node: ts.Expression; comment: string; trailing: string; refs: Set<string>; file: string };
const rows: Row[] = [];
const kept: string[] = [];
const keptRefs: Set<string>[] = [];
let tableStmt: ts.VariableStatement | undefined;
for (const s of sf.statements) {
  if (ts.isImportDeclaration(s)) continue;
  const ns = names(s);
  if (ts.isVariableStatement(s) && ns[0] === TABLE) {
    tableStmt = s;
    const init = s.declarationList.declarations[0].initializer as ts.ObjectLiteralExpression;
    // A comment on the same line as a row (`3: 'x', // Lightning`) is that row's, though
    // the parser hands it to the next row's leading trivia.
    const props = init.properties;
    const trivia = (i: number) => text.slice(props[i].getFullStart(), props[i].getStart(sf));
    const sameLine = (s: string) => (s.includes('\n') ? s.slice(0, s.indexOf('\n')) : '').trim();
    const trailingOf = (i: number) =>
      i + 1 < props.length ? sameLine(trivia(i + 1)) : (text.slice(props[i].getEnd(), init.getEnd()).match(/^\s*,?[ \t]*(\/\/[^\n]*)/)?.[1] ?? '');
    props.forEach((p, i) => {
      const pa = p as ts.PropertyAssignment;
      const key = Number(pa.name.getText(sf));
      const lead = trivia(i);
      const own = (sameLine(lead) ? lead.slice(lead.indexOf('\n') + 1) : lead).replace(/^\s*\n/, '').trimEnd();
      const trailing = trailingOf(i);
      // Not a skill (e.g. 0 = plain weapon swings): stays in the controller's table.
      if (!hasHome(key)) {
        kept.push(`\n${own ? own + '\n' : ''}  ${p.getText(sf)},${trailing ? ' ' + trailing : ''}`);
        keptRefs.push(refsOf(pa.initializer));
        return;
      }
      rows.push({ key, text: pa.initializer.getText(sf), node: pa.initializer, comment: own, trailing, refs: refsOf(pa.initializer), file: skillHome(key).file });
    });
    continue;
  }
  const u: Unit = { names: ns, stmt: s, refs: refsOf(s) };
  for (const n of ns) u.refs.delete(n);
  units.push(u);
  for (const n of ns) byName.set(n, u);
}
if (!tableStmt) throw new Error(`${TABLE} not found in ${SRC}`);

// Names other files import from the source stay where they are.
const exportedNames = new Set(units.filter(u => ts.getModifiers(u.stmt as ts.HasModifiers)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)).flatMap(u => u.names));
const outsideUse = new Set<string>();
{
  const files = (dirFiles('src') as string[]).concat(dirFiles('versions') as string[]);
  const base = SRC.replace(/\.ts$/, '');
  for (const f of files) {
    if (f === SRC) continue;
    const t = read(f);
    if (!t.includes(posix.basename(base))) continue;
    for (const n of exportedNames) if (new RegExp(`\\b${n}\\b`).test(t)) outsideUse.add(n);
  }
}
function dirFiles(dir: string): string[] {
  const { readdirSync, statSync } = require('fs') as typeof import('fs');
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) out.push(...dirFiles(p));
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

// A unit moves when only rows (or other moving units) use it. Fixed point from the rows down.
const userFiles = new Map<Unit, Set<string>>();
const staysBecause = new Set<Unit>();
for (const u of units) if (u.names.length === 0 || u.names.some(n => outsideUse.has(n) || n === TABLE)) staysBecause.add(u);
for (const r of keptRefs) for (const n of r) { const u = byName.get(n); if (u) staysBecause.add(u); }
let changed = true;
const usedByStaying = (u: Unit) => units.some(v => v !== u && !v.target && !isMoving(v) && u.names.some(n => v.refs.has(n)));
const moving = new Set<Unit>();
function isMoving(u: Unit) { return moving.has(u); }
// Start optimistic: every unit referenced (transitively) from rows is a candidate.
const candidates = new Set<Unit>();
const stack = rows.flatMap(r => [...r.refs].map(n => byName.get(n)).filter((u): u is Unit => !!u));
while (stack.length) { const u = stack.pop()!; if (candidates.has(u)) continue; candidates.add(u); for (const n of u.refs) { const v = byName.get(n); if (v) stack.push(v); } }
for (const u of candidates) if (!staysBecause.has(u)) moving.add(u);
while (changed) {
  changed = false;
  for (const u of [...moving]) {
    const usedOutside = units.some(v => !moving.has(v) && v !== u && u.names.some(n => v.refs.has(n)));
    if (usedOutside) { moving.delete(u); changed = true; }
  }
}
void usedByStaying;

// Target file per moving unit: by the files that use it.
const homeParts = (f: string) => f.slice(ROOT.length + 1).split('/');
function combine(files: Set<string>): string {
  if (files.size === 1) return [...files][0];
  const parts = [...files].map(homeParts);
  const folders = new Set(parts.map(p => (p.length >= 3 ? `${p[0]}/${p[1]}` : '')));
  if (folders.size === 1 && !folders.has('')) return `${ROOT}/${[...folders][0]}/index.ts`;
  const classes = new Set(parts.map(p => (p.length >= 2 ? p[0] : '')));
  if (classes.size === 1 && !classes.has('')) return `${ROOT}/${[...classes][0]}/_shared.ts`;
  return GLOBAL_SHARED;
}
let progress = true;
while (progress) {
  progress = false;
  for (const u of moving) {
    if (u.target) continue;
    const files = new Set<string>();
    let ready = true;
    for (const r of rows) if (u.names.some(n => r.refs.has(n))) files.add(r.file);
    for (const v of moving) if (v !== u && u.names.some(n => v.refs.has(n))) { if (!v.target) ready = false; else files.add(v.target); }
    if (!ready) continue;
    u.target = combine(files);
    progress = true;
  }
}
for (const u of moving) if (!u.target) u.target = GLOBAL_SHARED; // cycles

// ---- report ---------------------------------------------------------------------------
const perFile = new Map<string, { units: Unit[]; rows: Row[] }>();
const slot = (f: string) => perFile.get(f) ?? perFile.set(f, { units: [], rows: [] }).get(f)!;
for (const u of moving) slot(u.target!).units.push(u);
for (const r of rows) slot(r.file).rows.push(r);
console.log(`${rows.length} rows, ${moving.size} helpers move, ${perFile.size} files touched`);
for (const [f, v] of [...perFile].sort()) console.log(`  ${v.rows.length} rows ${v.units.length} helpers  ${f}${existsSync(f) ? '' : '  (new)'}`);
if (dry) process.exit(0);

// ---- write targets ----------------------------------------------------------------------
const stmtText = (s: ts.Statement) => text.slice(s.getFullStart(), s.getEnd());
const withExport = (u: Unit, exported: boolean) => {
  const t = renamedSlice(u.stmt, u.stmt.getFullStart(), u.stmt.getEnd());
  if (!exported || ts.getModifiers(u.stmt as ts.HasModifiers)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) return t;
  const lead = text.slice(u.stmt.getFullStart(), u.stmt.getStart(sf));
  return lead + 'export ' + t.slice(lead.length);
};
// A moved helper whose name the target file already uses gets the property appended.
const renames = new Map<string, string>();
for (const [file, { units: us }] of perFile) {
  if (!existsSync(file)) continue;
  const tsf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const taken = new Set([...tsf.statements.flatMap(names), ...importsOf(tsf).keys()]);
  for (const u of us)
    for (const n of u.names)
      if (taken.has(n)) renames.set(n, /^[A-Z0-9_]+$/.test(n) ? `${n}_${PROP.toUpperCase()}` : `${n}${PROP[0].toUpperCase()}${PROP.slice(1)}`);
}
if (renames.size) console.log(`renamed: ${[...renames].map(([a, b]) => `${a} -> ${b}`).join(', ')}`);
const rn = (n: string) => renames.get(n) ?? n;

/** Source text of a node range with renamed identifiers swapped in. */
function renamedSlice(node: ts.Node, from: number, to: number): string {
  let s = text.slice(from, to);
  if (!renames.size) return s;
  const edits: [number, number, string][] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && renames.has(n.text)) {
      const p = n.parent;
      const isKey = (ts.isPropertyAccessExpression(p) && p.name === n) || ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === n) || (ts.isQualifiedName(p) && p.right === n);
      if (!isKey) edits.push([n.getStart(sf), n.getEnd(), ts.isShorthandPropertyAssignment(p) ? `${n.text}: ${rn(n.text)}` : rn(n.text)]);
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) s = s.slice(0, a - from) + r + s.slice(b - from);
  return s;
}

const neededExports = new Set<string>(); // staying source names that moved code imports
for (const [file, { units: us, rows: rs }] of perFile) {
  const exists = existsSync(file);
  let t = exists ? read(file) : '';
  const tsf = ts.createSourceFile(file, t, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const have = importsOf(tsf);
  const declared = new Set(tsf.statements.flatMap(names));
  const refs = new Set<string>();
  for (const u of us) for (const r of u.refs) refs.add(r);
  for (const r of rs) for (const x of r.refs) refs.add(x);
  for (const u of us) for (const n of u.names) refs.delete(n);
  // imports to add
  const add = new Map<string, Set<string>>();
  const want = (spec: string, entry: string) => (add.get(spec) ?? add.set(spec, new Set()).get(spec)!).add(entry);
  for (const n of [...refs].sort()) {
    if (have.has(rn(n)) || declared.has(rn(n))) continue;
    const b = srcImports.get(n);
    if (b) {
      if (b.name === '*' || b.name === 'default') throw new Error(`unsupported import form for ${n}`);
      want(specFrom(file, resolveSpec(SRC, b.spec)), `${b.typeOnly ? 'type ' : ''}${b.name === b.alias ? n : `${b.name} as ${n}`}`);
      continue;
    }
    const u = byName.get(n);
    if (!u) continue; // global or local
    if (moving.has(u)) { if (u.target !== file) want(specFrom(file, u.target!), rn(n)); continue; }
    neededExports.add(n);
    want(specFrom(file, SRC), n);
  }
  const importLines = [...add].map(([spec, set]) => `import { ${[...set].join(', ')} } from '${spec}';`).join('\n');
  const movedText = us.sort((a, b) => a.stmt.pos - b.stmt.pos).map(u => withExport(u, isUsedElsewhere(u, file))).join('');
  if (!exists && rs.length) {
    const h = skillHome(rs[0].key);
    t = `import { defineSkill } from '@/controllers/skills/define';\n\nexport default defineSkill({\n  id: ${h.id},\n  name: ${JSON.stringify(h.name)},\n});\n`;
  }
  // property into defineSkill
  if (rs.length) {
    if (rs.length > 1) throw new Error(`${file} gets ${rs.length} ${TABLE} rows`);
    const r = rs[0];
    const value = renamedSlice(r.node, r.node.getStart(sf), r.node.getEnd());
    const prop = `${r.comment ? r.comment + '\n' : ''}  ${PROP}: ${value},${r.trailing ? ' ' + r.trailing : ''}\n`;
    const end = t.lastIndexOf('});');
    if (end < 0 || !/export default define(Skill|BuffLooks)\(/.test(t)) throw new Error(`no defineSkill in ${file}`);
    t = t.slice(0, end) + prop + t.slice(end);
  }
  // helpers before the default export (or at the end of a shared file)
  if (movedText) {
    const at = t.indexOf('export default define');
    t = at >= 0 ? t.slice(0, at) + movedText.trim() + '\n\n' + t.slice(at) : t.trimEnd() + '\n' + movedText + '\n';
  }
  // imports after the last import line
  if (importLines) {
    const lastImport = [...t.matchAll(/^import [^;]+;\s*$/gm)].pop();
    const at = lastImport ? lastImport.index! + lastImport[0].length : 0;
    t = t.slice(0, at) + (at ? '\n' : '') + importLines + '\n' + t.slice(at);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, t.replace(/\n{3,}/g, '\n\n').replace(/\n/g, nlOf(file)));
}
function isUsedElsewhere(u: Unit, file: string): boolean {
  for (const [f, v] of perFile) {
    if (f === file) continue;
    if (v.rows.some(r => u.names.some(n => r.refs.has(n))) || v.units.some(w => u.names.some(n => w.refs.has(n)))) return true;
  }
  return false;
}

// ---- rewrite source ------------------------------------------------------------------
let out = text;
const edits: [number, number, string][] = [];
const init = tableStmt.declarationList.declarations[0].initializer!;
edits.push([init.getStart(sf), init.getEnd(), kept.length ? `{${kept.join('')}\n}` : '{}']);
for (const u of moving) edits.push([u.stmt.getFullStart(), u.stmt.getEnd(), '']);
for (const n of neededExports) {
  const u = byName.get(n)!;
  if (ts.getModifiers(u.stmt as ts.HasModifiers)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
  edits.push([u.stmt.getStart(sf), u.stmt.getStart(sf), 'export ']);
}
for (const [a, b, s] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + s + out.slice(b);
// drop import bindings the source no longer uses
const osf = ts.createSourceFile(SRC, out, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const used = new Set<string>();
for (const s of osf.statements) if (!ts.isImportDeclaration(s)) for (const r of refsOf(s)) used.add(r);
const importEdits: [number, number, string][] = [];
for (const s of osf.statements) {
  if (!ts.isImportDeclaration(s) || !s.importClause) continue;
  const c = s.importClause;
  const nb = c.namedBindings;
  if (!nb || !ts.isNamedImports(nb) || c.name) continue;
  const keep = nb.elements.filter(e => used.has(e.name.text));
  if (keep.length === nb.elements.length) continue;
  importEdits.push([s.getFullStart(), s.getEnd(), keep.length ? `\nimport ${c.isTypeOnly ? 'type ' : ''}{ ${keep.map(e => e.getText(osf)).join(', ')} } from ${s.moduleSpecifier.getText(osf)};` : '']);
}
for (const [a, b, s] of importEdits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + s + out.slice(b);
writeFileSync(SRC, out.replace(/\n{3,}/g, '\n\n').replace(/\n/g, nlOf(SRC)));
console.log(`moved ${TABLE} into ${perFile.size} files`);
