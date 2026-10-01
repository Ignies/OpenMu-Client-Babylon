// Splits versions/shared/skills/skillVisuals.ts into the skills engine
// (src/controllers/skills/visuals.ts) and one folder per skill.
// Usage: bun tools/restructure/splitSkills.ts [--dry-run]. See tools/restructure/readme.md.
import ts from 'typescript';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, posix } from 'path';
import { skillHome, BUFF_OWNERS, type Home } from './skillHomes';

const SRC = 'versions/shared/skills/skillVisuals.ts';
const ROOT = 'versions/shared/skills';
const ENGINE = 'src/controllers/skills/visuals.ts';
const GLOBAL_SHARED = `${ROOT}/_shared.ts`;
const LAUNCHERS = 'versions/shared/items/launcher_arrows.ts';
const COMMON_BUFFS = `${ROOT}/common/buff_looks.ts`;
const dry = process.argv.includes('--dry-run');

const raw = readFileSync(SRC, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const text = raw.replace(/\r\n/g, '\n');
const sf = ts.createSourceFile(SRC, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;

// ---- imports ---------------------------------------------------------------
type Binding = { spec: string; name: string; alias: string; typeOnly: boolean };
const imports = new Map<string, Binding>();
// ---- declarations ----------------------------------------------------------
type Unit = { id: string; names: string[]; text: string; start: number; refs: Set<string>; assigns: Set<string>; pinned: boolean; module?: string; exported: boolean; isLet: boolean };
const units: Unit[] = [];
const byName = new Map<string, Unit>();
type Row = { table: string; key: number; text: string; comment: string; refs: Set<string> };
const rows: Row[] = [];

const ROW_TABLES = new Set(['SKILL_VISUALS', 'BUFF_VISUALS', 'BUFF_ARRIVALS', 'LAUNCHER_ARROWS']);
const PIN_NAMES = new Set([
  'shoot', 'fanArrows', 'currentSkill', 'MASTER_ALIASES', 'NOTHING', 'fallbackFor', 'baseSkill', 'skillVisualFor',
  'skillVisualCount', 'contextFor', 'runTravel', 'playTargetedSkillVisual', 'playAreaSkillVisual', 'BOW_MUZZLE_HEIGHT',
  'BOW_MUZZLE_FORWARD', 'ARROW_BURST', 'playBowShotVisual', 'BuffLook', 'SHARED_LOOKS', 'GREEN_KNOT', 'buffHandles',
  'keepLook', 'setBuffVisual', 'clearBuffVisuals', 'BuffArrival', 'LAUNCHER_ARROWS',
]);
const PIN_LINES: [number, number][] = [[235, 372], [532, 588]];

function declaredNames(s: ts.Statement): string[] {
  if (ts.isVariableStatement(s)) return s.declarationList.declarations.map(d => (d.name as ts.Identifier).text);
  if ((ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isEnumDeclaration(s)) && s.name) return [s.name.text];
  return [];
}

function isDeclName(n: ts.Identifier): boolean {
  const p = n.parent;
  if (ts.isPropertyAccessExpression(p) && p.name === n) return true;
  if (ts.isQualifiedName(p) && p.right === n) return true;
  if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isMethodSignature(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p) || ts.isEnumMember(p)) && p.name === n) return true;
  if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isClassDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isTypeParameterDeclaration(p) || ts.isEnumDeclaration(p)) && p.name === n) return true;
  if (ts.isBindingElement(p) && (p.name === n || p.propertyName === n)) return true;
  if (ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p)) return true;
  return false;
}

/** Identifiers a node uses, and the top-level `let`s it assigns. */
function scan(node: ts.Node): { refs: Set<string>; assigns: Set<string> } {
  const refs = new Set<string>();
  const assigns = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && !isDeclName(n)) refs.add(n.text);
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment && ts.isIdentifier(n.left)) assigns.add(n.left.text);
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && ts.isIdentifier(n.operand) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)) assigns.add(n.operand.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return { refs, assigns };
}

for (const s of sf.statements) {
  if (ts.isImportDeclaration(s)) {
    const spec = (s.moduleSpecifier as ts.StringLiteral).text;
    const c = s.importClause;
    if (!c) continue;
    if (c.name) imports.set(c.name.text, { spec, name: 'default', alias: c.name.text, typeOnly: !!c.isTypeOnly });
    const nb = c.namedBindings;
    if (nb && ts.isNamedImports(nb))
      for (const e of nb.elements) imports.set(e.name.text, { spec, name: (e.propertyName ?? e.name).text, alias: e.name.text, typeOnly: c.isTypeOnly || e.isTypeOnly });
    if (nb && ts.isNamespaceImport(nb)) imports.set(nb.name.text, { spec, name: '*', alias: nb.name.text, typeOnly: !!c.isTypeOnly });
    continue;
  }
  const names = declaredNames(s);
  const full = text.slice(s.getFullStart(), s.getEnd());
  if (ts.isVariableStatement(s) && names.length === 1 && ROW_TABLES.has(names[0])) {
    const init = s.declarationList.declarations[0].initializer;
    if (!init || !ts.isObjectLiteralExpression(init)) throw new Error(`${names[0]} is not an object literal`);
    for (const p of init.properties) {
      if (ts.isSpreadAssignment(p)) throw new Error(`spread in ${names[0]}`);
      const pa = p as ts.PropertyAssignment;
      const key = Number((pa.name as ts.NumericLiteral | ts.Identifier).getText(sf));
      const comment = text.slice(p.getFullStart(), p.getStart(sf)).replace(/^\s*\n/, '').trimEnd();
      rows.push({ table: names[0], key, text: pa.initializer.getText(sf), comment, refs: scan(pa.initializer).refs });
    }
    const emptied = full.slice(0, init.getStart(sf) - s.getFullStart()) + '{}' + full.slice(init.getEnd() - s.getFullStart());
    const u: Unit = { id: names[0], names, text: emptied, start: s.getStart(sf), refs: scan(s.declarationList.declarations[0].type ?? s).refs, assigns: new Set(), pinned: true, exported: true, isLet: false };
    units.push(u);
    byName.set(names[0], u);
    continue;
  }
  const { refs, assigns } = scan(s);
  for (const n of names) refs.delete(n);
  const line = lineOf(s.getStart(sf));
  const pinned = names.length === 0 || names.some(n => PIN_NAMES.has(n)) || PIN_LINES.some(([a, b]) => line >= a && line <= b);
  const isLet = ts.isVariableStatement(s) && (s.declarationList.flags & ts.NodeFlags.Let) !== 0;
  const prev = names.length ? byName.get(names[0]) : undefined;
  if (prev) {
    prev.text += full; // overload signatures + implementation
    for (const r of refs) prev.refs.add(r);
    continue;
  }
  const u: Unit = { id: names[0] ?? `stmt@${line}`, names, text: full, start: s.getStart(sf), refs, assigns, pinned, exported: !!ts.getModifiers(s as ts.HasModifiers)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword), isLet };
  units.push(u);
  for (const n of names) byName.set(n, u);
}

// ---- row homes -----------------------------------------------------------------
function rowModule(r: Row): string {
  if (r.table === 'SKILL_VISUALS') return skillHome(r.key).file;
  if (r.table === 'LAUNCHER_ARROWS') return LAUNCHERS;
  const owner = BUFF_OWNERS[r.key];
  return owner === undefined ? COMMON_BUFFS : skillHome(owner).file;
}

// ---- placement -------------------------------------------------------------------
const users = new Map<Unit, Set<string>>(); // unit -> modules that reference it
const addUse = (name: string, module: string) => {
  const u = byName.get(name);
  if (!u) return;
  (users.get(u) ?? users.set(u, new Set()).get(u)!).add(module);
};
const homeOf = new Map<string, Home>();
for (const r of rows) homeOf.set(rowModule(r), r.table === 'LAUNCHER_ARROWS' ? { cls: '_', folder: '', file: LAUNCHERS } : r.table === 'SKILL_VISUALS' ? skillHome(r.key) : r.key in BUFF_OWNERS ? skillHome(BUFF_OWNERS[r.key]) : { cls: 'common', folder: '', file: COMMON_BUFFS });

// A let and whoever assigns it must share a module: merge them into one placement group.
const group = new Map<Unit, Unit>();
const find = (u: Unit): Unit => (group.get(u) && group.get(u) !== u ? find(group.get(u)!) : u);
for (const u of units) for (const a of u.assigns) { const t = byName.get(a); if (t && t !== u && t.isLet) group.set(find(u), find(t)); }

function combine(mods: Set<string>): string {
  if (mods.has(ENGINE)) return ENGINE;
  if (mods.size === 1) return [...mods][0];
  const homes = [...mods].map(m => homeOf.get(m) ?? folderHome(m));
  const folders = new Set(homes.map(h => h.folder && `${h.cls}/${h.folder}`));
  if (folders.size === 1 && !folders.has('')) return `${ROOT}/${[...folders][0]}/index.ts`;
  const classes = new Set(homes.map(h => h.cls));
  if (classes.size === 1 && !classes.has('_')) return `${ROOT}/${[...classes][0]}/_shared.ts`;
  return GLOBAL_SHARED;
}
function folderHome(m: string): Home {
  if (m === GLOBAL_SHARED || m === LAUNCHERS) return { cls: '_', folder: '', file: m };
  const rel = m.slice(ROOT.length + 1).split('/');
  if (rel.length === 2) return { cls: rel[0], folder: '', file: m }; // <class>/_shared.ts or common/buff_looks.ts
  return { cls: rel[0], folder: rel[1], file: m };
}

// Exported for outside callers only: place them with the skill they belong to.
const HINTS: Record<string, number> = { playChainLightningHop: 215, playTeleportFlash: 6, playSoulBarrierShell: 16 };
for (const [name, id] of Object.entries(HINTS)) addUse(name, skillHome(id).file);

// Seed: pinned units sit in the engine.
for (const u of units) if (u.pinned) u.module = ENGINE;
for (const r of rows) for (const n of r.refs) addUse(n, rowModule(r));

// Fixed point: place a unit once every unit that references it is placed.
const referencers = new Map<Unit, Unit[]>();
for (const u of units) for (const n of u.refs) { const t = byName.get(n); if (t && t !== u) (referencers.get(t) ?? referencers.set(t, []).get(t)!).push(u); }
let progress = true;
while (progress) {
  progress = false;
  for (const u of units) {
    if (u.module) continue;
    const g = find(u);
    const members = units.filter(x => find(x) === g);
    const refsBy = members.flatMap(m => referencers.get(m) ?? []).filter(x => find(x) !== g);
    if (refsBy.some(x => !x.module)) continue;
    const mods = new Set<string>();
    for (const x of refsBy) mods.add(x.module!);
    for (const m of members) for (const mm of users.get(m) ?? []) mods.add(mm);
    const target = mods.size ? combine(mods) : GLOBAL_SHARED;
    for (const m of members) m.module = target;
    progress = true;
  }
}
const stuck = units.filter(u => !u.module);
if (stuck.length) {
  // Reference cycles between unplaced units: place each cycle as one, by its outside users.
  for (const u of stuck) u.module = GLOBAL_SHARED;
  console.warn(`cycle fallback to ${GLOBAL_SHARED}: ${stuck.map(u => u.id).join(', ')}`);
}

// ---- report ------------------------------------------------------------------------
const perModule = new Map<string, Unit[]>();
for (const u of units) (perModule.get(u.module!) ?? perModule.set(u.module!, []).get(u.module!)!).push(u);
const rowsPerModule = new Map<string, Row[]>();
for (const r of rows) (rowsPerModule.get(rowModule(r)) ?? rowsPerModule.set(rowModule(r), []).get(rowModule(r))!).push(r);
const allModules = [...new Set([...perModule.keys(), ...rowsPerModule.keys()])].sort();
const lines = (us: Unit[] | undefined) => (us ?? []).reduce((n, u) => n + u.text.split('\n').length, 0);
console.log(`${units.length} declarations, ${rows.length} rows, ${allModules.length} modules`);
for (const m of allModules) console.log(`${String(lines(perModule.get(m))).padStart(6)} lines ${String(rowsPerModule.get(m)?.length ?? 0).padStart(3)} rows  ${m}`);
if (process.argv.includes("--engine")) console.log("engine pulled in:", units.filter(u => u.module === ENGINE && !u.pinned).map(u => u.id).join(", "));
if (dry) process.exit(0);

// ---- emit ----------------------------------------------------------------------------
const moduleOf = (name: string): string | undefined => byName.get(name)?.module;
for (const u of units) {
  if (u.exported) continue;
  for (const v of units) if (v.module !== u.module && u.names.some(n => v.refs.has(n))) u.exported = true;
  for (const r of rows) if (rowModule(r) !== u.module && u.names.some(n => r.refs.has(n))) u.exported = true;
}

function specFrom(fromModule: string, target: string): string {
  const noExt = target.replace(/\.tsx?$/, '').replace(/\/index$/, '');
  if (noExt.startsWith('src/')) return '@/' + noExt.slice(4);
  const r = posix.relative(posix.dirname(fromModule), noExt);
  return r.startsWith('.') ? r : './' + r;
}
function importTarget(b: Binding): string {
  if (!b.spec.startsWith('.')) return b.spec;
  return posix.normalize(posix.join(ROOT, b.spec));
}

function importsFor(module: string, refs: Set<string>): string {
  const groups = new Map<string, { names: Set<string>; types: Set<string>; def?: string; ns?: string }>();
  const add = (spec: string) => groups.get(spec) ?? groups.set(spec, { names: new Set(), types: new Set() }).get(spec)!;
  for (const n of [...refs].sort()) {
    const b = imports.get(n);
    if (b) {
      const t = importTarget(b);
      const spec = b.spec.startsWith('.') ? specFrom(module, t) : t;
      const g = add(spec);
      if (b.name === 'default') g.def = b.alias;
      else if (b.name === '*') g.ns = b.alias;
      else (b.typeOnly ? g.types : g.names).add(b.name === b.alias ? b.name : `${b.name} as ${b.alias}`);
      continue;
    }
    const home = moduleOf(n);
    if (home && home !== module) add(specFrom(module, home)).names.add(n);
  }
  const out: string[] = [];
  for (const [spec, g] of groups) {
    if (g.ns) out.push(`import * as ${g.ns} from '${spec}';`);
    const named = [...g.names, ...[...g.types].map(t => `type ${t}`)];
    if (g.def || named.length) out.push(`import ${[g.def, named.length ? `{ ${named.join(', ')} }` : ''].filter(Boolean).join(', ')} from '${spec}';`);
  }
  return out.join('\n');
}

const withExport = (u: Unit) => (u.exported && !/^\s*(\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*export\s/.test(u.text) ? u.text.replace(/^(\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*)(?=(const|let|function|interface|type|class|enum|async)\b)/, '$1export ') : u.text);

const written: string[] = [];
const write = (path: string, body: string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body.replace(/\n{3,}/g, '\n\n').trimStart().replace(/\n/g, nl));
  written.push(path);
};

const DEFINE = '@/controllers/skills/define';
for (const m of allModules) {
  const us = (perModule.get(m) ?? []).sort((a, b) => a.start - b.start);
  const rs = rowsPerModule.get(m) ?? [];
  const refs = new Set<string>();
  for (const u of us) for (const r of u.refs) refs.add(r);
  for (const r of rs) for (const x of r.refs) refs.add(x);
  for (const u of us) for (const n of u.names) refs.delete(n);
  let body = importsFor(m, refs);
  let tail = '';
  if (m === LAUNCHERS) {
    const rowsText = rs.map(r => `${r.comment ? r.comment + '\n' : ''}  ${r.key}: ${r.text},`).join('\n');
    tail = `\n/** Bow and crossbow arrows by launcher item index (group 4). */\nexport const LAUNCHER_ARROWS = {\n${rowsText}\n};\n`;
  } else if (rs.length && m === COMMON_BUFFS) {
    body = `import { defineBuffLooks } from '${DEFINE}';\n` + body;
    tail = `\nexport default defineBuffLooks({\n${rs.map(r => `${r.comment ? r.comment + '\n' : ''}  ${r.key}: ${r.text},`).join('\n')}\n});\n`;
  } else if (rs.length) {
    const home = homeOf.get(m)!;
    const visual = rs.find(r => r.table === 'SKILL_VISUALS');
    const buffs = rs.filter(r => r.table === 'BUFF_VISUALS');
    const arrivals = rs.filter(r => r.table === 'BUFF_ARRIVALS');
    const id = home.id!;
    body = `import { defineSkill } from '${DEFINE}';\n` + body;
    const parts = [`  id: ${id},`, `  name: ${JSON.stringify(home.name)},`];
    if (visual) parts.push(`${visual.comment ? visual.comment + '\n' : ''}  visual: ${visual.text},`);
    if (buffs.length) parts.push(`  buffs: {\n${buffs.map(r => `${r.comment ? r.comment.replace(/^/gm, '  ') + '\n' : ''}    ${r.key}: ${r.text},`).join('\n')}\n  },`);
    if (arrivals.length) parts.push(`  buffArrivals: { ${arrivals.map(r => `${r.key}: ${r.text}`).join(', ')} },`);
    tail = `\nexport default defineSkill({\n${parts.join('\n')}\n});\n`;
  }
  const decls = us.map(withExport).join('');
  write(m, `${body}\n${decls}\n${tail}`);
}

// ---- barrel + facade ---------------------------------------------------------------
const skillFiles = allModules.filter(m => rowsPerModule.has(m) && m !== COMMON_BUFFS && m !== LAUNCHERS);
const ident = (m: string) => m.slice(ROOT.length + 1).replace(/\.ts$/, '').replace(/\/index$/, '').replace(/[^a-zA-Z0-9]+/g, '_');
write(`${ROOT}/index.ts`, [
  `import { registerBuffLooks, registerLauncherArrows, registerSkills } from '@/controllers/skills';`,
  `import { LAUNCHER_ARROWS } from '${specFrom(`${ROOT}/index.ts`, LAUNCHERS)}';`,
  `import commonBuffLooks from './common/buff_looks';`,
  ...skillFiles.map(m => `import ${ident(m)} from '${specFrom(`${ROOT}/index.ts`, m)}';`),
  '',
  '/** Every shared skill, one entry per file. A version picks from this list. */',
  `export const SHARED_SKILLS = [\n${skillFiles.map(m => `  ${ident(m)},`).join('\n')}\n];`,
  '',
  'registerSkills(SHARED_SKILLS);',
  'registerBuffLooks(commonBuffLooks);',
  'registerLauncherArrows(LAUNCHER_ARROWS);',
  '',
].join('\n'));

const exportedNames = units.filter(u => /(^|\n)\s*export\s/.test(text.slice(u.start, u.start + 40)) || u.exported && u.module === ENGINE);
const facade: string[] = [`// Old entry point, kept so importers stay unchanged. Loads every shared skill.`, `import './index';`];
const originalExports = units.filter(u => /^export\s/.test(text.slice(u.start, u.start + 7)));
for (const u of originalExports) {
  const typeOnly = /^export\s+(interface|type)\s/.test(text.slice(u.start, u.start + 20));
  facade.push(`export ${typeOnly ? 'type ' : ''}{ ${u.names.join(', ')} } from '${specFrom(SRC, u.module!)}';`);
}
void exportedNames;
write(SRC, facade.join('\n') + '\n');
console.log(`wrote ${written.length} files`);
