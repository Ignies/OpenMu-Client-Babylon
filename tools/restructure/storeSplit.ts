// Rewrites `Store.<member>` (and `storeRef().<member>`) to the member's new home, and moves named
// imports of `src/app/store.ts` (types, enums, constants) to the file that exports them now.
// Usage: bun tools/restructure/storeSplit.ts <map.json> [--dry-run]
// map.json: { "members": { "<member>": { "expr": "Hero", "name": "Hero", "door": "src/modules/hero/index.ts",
//   "home": "src/modules/hero/state.ts" } }, "exports": { "UIState": { "door": "src/app/uiState.ts" } } }
// `expr` replaces the whole `Store.<member>` (default `<name>.<member>`); files inside `home`'s folder import
// `home`, everyone else `door`. Inside store.ts `this.<member>` of the store class is rewritten too.
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'fs';
import { posix } from 'path';
import { trackedFiles } from '../checks/graph';

type Member = { expr?: string; name: string; door: string; home?: string };
type Moved = { door: string; home?: string; type?: boolean };
type Map_ = { members?: Record<string, Member>; exports?: Record<string, Moved> };

const [mapFile, ...flags] = process.argv.slice(2);
if (!mapFile) throw new Error('usage: storeSplit.ts <map.json> [--dry-run]');
const dry = flags.includes('--dry-run');
const map: Map_ = JSON.parse(readFileSync(mapFile, 'utf8'));
const members = map.members ?? {};
const exportsMoved = map.exports ?? {};

const STORE = 'src/app/store.ts';
const STORE_REF = 'src/app/storeRef.ts';
const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const files = trackedFiles(['src', 'versions', 'tools']).filter(f => /\.tsx?$/.test(f) && !/Packets\.ts$/.test(f));
const known = new Set(files);

function resolve(from: string, spec: string): string | null {
  let base: string | null = null;
  if (spec.startsWith('.')) base = posix.normalize(posix.join(posix.dirname(from), spec)).replace(/\/$/, '');
  else if (spec.startsWith('@/')) base = 'src/' + spec.slice(2);
  else if (spec.startsWith('@versions/')) base = 'versions/' + spec.slice(10);
  if (base === null) return null;
  for (const e of EXTS) if (known.has(base + e)) return base + e;
  return null;
}

const stem = (p: string) => p.replace(/\/index\.tsx?$/, '').replace(/\.tsx?$/, '');

/** The specifier `file` uses for `target`: the target's folder or file, relative inside src/ (alias for long paths). */
function specFor(file: string, target: string, aliasStyle: boolean): string {
  const s = stem(target);
  const alias = s.startsWith('src/') ? '@/' + s.slice(4) : '@versions/' + s.slice(9);
  if (aliasStyle || file.startsWith('versions/') || file.startsWith('tools/')) return alias;
  let rel = posix.relative(posix.dirname(file), s);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.startsWith('../../../') ? alias : rel;
}

/** Which import a file needs for a home: the home file inside its folder, the door outside. */
function targetFor(file: string, door: string, home?: string): string {
  if (home && file.startsWith(posix.dirname(home) + '/')) return home;
  return door;
}

let changed = 0;
const problems: string[] = [];

for (const file of files) {
  if (file === STORE_REF || file === mapFile) continue;
  const raw = readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const text = crlf ? raw.replace(/\r\n/g, '\n') : raw;
  if (file !== STORE && !text.includes('app/store') && !text.includes('storeRef') && !/\.\/store'/.test(text)) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  // The store imports of this file.
  let storeImport: ts.ImportDeclaration | null = null;
  let refImport: ts.ImportDeclaration | null = null;
  let storeLocal = file === STORE ? 'Store' : '';
  let refLocal = '';
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const to = resolve(file, st.moduleSpecifier.text);
    const named = st.importClause?.namedBindings;
    if (to === STORE && file !== STORE) {
      // A side-effect `import './store'` stays; the named import is the one rewritten.
      if (!st.importClause) continue;
      storeImport = st;
      if (named && ts.isNamedImports(named)) for (const el of named.elements) if ((el.propertyName ?? el.name).text === 'Store') storeLocal = el.name.text;
    } else if (to === STORE_REF) {
      refImport = st;
      if (named && ts.isNamedImports(named)) for (const el of named.elements) if ((el.propertyName ?? el.name).text === 'storeRef') refLocal = el.name.text;
    }
  }
  if (!storeImport && !refImport && file !== STORE) continue;

  const edits: [number, number, string][] = [];
  const needs = new Map<string, string>(); // import name -> target file
  const need = (name: string, target: string) => {
    if (needs.has(name) && needs.get(name) !== target) problems.push(`${file}: ${name} from two places`);
    needs.set(name, target);
  };

  const storeClass = file === STORE ? findStoreClass(sf) : null;
  const visit = (n: ts.Node): void => {
    // `typeof Store.x` in a type.
    if (ts.isQualifiedName(n) && members[n.right.text] && ts.isIdentifier(n.left) && storeLocal && n.left.text === storeLocal) {
      const m = members[n.right.text];
      const expr = m.expr ?? `${m.name}.${n.right.text}`;
      if (/^[\w.]+$/.test(expr)) {
        edits.push([n.getStart(sf), n.getEnd(), expr]);
        need(m.name, targetFor(file, m.door, m.home));
      } else problems.push(`${file}: typeof Store.${n.right.text}`);
      return;
    }
    if (ts.isPropertyAccessExpression(n) && members[n.name.text]) {
      const head = n.expression;
      const isStore = storeLocal && ts.isIdentifier(head) && head.text === storeLocal && !ts.isImportSpecifier(head.parent);
      const isRef = refLocal && ts.isCallExpression(head) && ts.isIdentifier(head.expression) && head.expression.text === refLocal && head.arguments.length === 0;
      const isThis = storeClass && head.kind === ts.SyntaxKind.ThisKeyword && thisIsStore(n, storeClass);
      if (isStore || isRef || isThis) {
        const m = members[n.name.text];
        if (file === m.home) {
          problems.push(`${file}: Store.${n.name.text} inside its own home`);
        } else {
          edits.push([n.getStart(sf), n.getEnd(), m.expr ?? `${m.name}.${n.name.text}`]);
          need(m.name, targetFor(file, m.door, m.home));
        }
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);

  // Named imports of store.ts that moved elsewhere.
  const keptStoreNames: string[] = [];
  let storeTypeOnly = false;
  if (storeImport) {
    storeTypeOnly = !!storeImport.importClause?.isTypeOnly;
    const named = storeImport.importClause?.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const el of named.elements) {
        const imported = (el.propertyName ?? el.name).text;
        const moved = exportsMoved[imported];
        if (moved && imported !== 'Store') {
          if (el.propertyName) problems.push(`${file}: aliased import ${imported}`);
          need((el.isTypeOnly || storeTypeOnly ? 'type ' : '') + imported, targetFor(file, moved.door, moved.home));
        } else keptStoreNames.push(el.getText(sf));
      }
    }
  }
  if (!edits.length && !needs.size) continue;

  // Apply the body edits, then decide whether Store / storeRef are still used.
  let body = text;
  for (const [s, e, r] of edits.sort((a, b) => b[0] - a[0])) body = body.slice(0, s) + r + body.slice(e);
  const sf2 = ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const stillUses = (name: string) => {
    if (!name) return false;
    let hit = false;
    const v = (n: ts.Node): void => {
      if (hit) return;
      if (ts.isImportDeclaration(n)) return;
      if (ts.isIdentifier(n) && n.text === name && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) hit = true;
      ts.forEachChild(n, v);
    };
    v(sf2);
    return hit;
  };

  // Rebuild the store / storeRef import lines in sf2 (positions in the new text).
  const already = new Set<string>();
  for (const st of sf2.statements) {
    if (!ts.isImportDeclaration(st)) continue;
    const named = st.importClause?.namedBindings;
    if (named && ts.isNamedImports(named)) for (const el of named.elements) already.add(el.name.text);
    if (st.importClause?.name) already.add(st.importClause.name.text);
  }
  const lineEdits: [number, number, string][] = [];
  const imports: string[] = [];
  const byTarget = new Map<string, string[]>();
  for (const [name, target] of needs) {
    const bare = name.replace(/^type /, '');
    if (already.has(bare) && !keptStoreNames.some(k => k === bare)) {
      // Already imported from somewhere else (or the file itself).
      if (!exportsMoved[bare]) continue;
    }
    if (target === file) continue;
    byTarget.set(target, [...(byTarget.get(target) ?? []), name]);
  }
  const aliasStyle = !!storeImport && ts.isStringLiteral(storeImport.moduleSpecifier) && storeImport.moduleSpecifier.text.startsWith('@/');
  for (const [target, names] of byTarget) {
    const allType = names.every(n => n.startsWith('type '));
    const list = allType ? names.map(n => n.slice(5)) : names;
    imports.push(`import ${allType ? 'type ' : ''}{ ${list.join(', ')} } from '${specFor(file, target, aliasStyle)}';`);
  }

  // Body edits never add or drop a statement, so the same index is the same import.
  const findIn2 = (old: ts.ImportDeclaration | null) => {
    if (!old) return null;
    const st = sf2.statements[sf.statements.indexOf(old)];
    return st && ts.isImportDeclaration(st) ? st : null;
  };
  let anchor: { start: number; end: number; keep: string } | null = null;
  const st2 = findIn2(storeImport);
  if (st2) {
    const names = keptStoreNames.filter(k => !(k === storeLocal && !stillUses(storeLocal)) && !(k.endsWith(` as ${storeLocal}`) && !stillUses(storeLocal)));
    const spec = (st2.moduleSpecifier as ts.StringLiteral).text;
    const keep = names.length ? `import ${storeTypeOnly ? 'type ' : ''}{ ${names.join(', ')} } from '${spec}';` : '';
    anchor = { start: st2.getStart(sf2), end: st2.getEnd(), keep };
  }
  const ref2 = findIn2(refImport);
  if (ref2 && refLocal && !stillUses(refLocal)) {
    if (anchor) lineEdits.push([ref2.getStart(sf2), lineEnd(body, ref2.getEnd()), '']);
    else anchor = { start: ref2.getStart(sf2), end: ref2.getEnd(), keep: '' };
  }
  if (anchor) {
    const block = [anchor.keep, ...imports].filter(Boolean).join('\n');
    lineEdits.push([anchor.start, block ? anchor.end : lineEnd(body, anchor.end), block]);
  } else if (imports.length) {
    // store.ts itself, or a storeRef import kept: add after the last import.
    const last = [...sf2.statements].filter(ts.isImportDeclaration).pop();
    const at = last ? last.getEnd() : 0;
    lineEdits.push([at, at, (last ? '\n' : '') + imports.join('\n') + (last ? '' : '\n')]);
  }
  let out = body;
  for (const [s, e, r] of lineEdits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + r + out.slice(e);
  if (out === text) continue;
  changed++;
  if (!dry) writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
}

function lineEnd(text: string, at: number): number {
  return text[at] === '\n' ? at + 1 : at;
}

function findStoreClass(sf: ts.SourceFile): ts.ClassLikeDeclaration | null {
  let found: ts.ClassLikeDeclaration | null = null;
  const v = (n: ts.Node): void => {
    if (found) return;
    if ((ts.isClassExpression(n) || ts.isClassDeclaration(n)) && n.name?.text === '_Store') found = n;
    else ts.forEachChild(n, v);
  };
  v(sf);
  return found;
}

/** Whether `this` in `n` is the store instance: the nearest non-arrow function is a member of the store class. */
function thisIsStore(n: ts.Node, cls: ts.ClassLikeDeclaration): boolean {
  let p: ts.Node | undefined = n.parent;
  while (p) {
    if (ts.isClassLike(p)) return p === cls;
    if ((ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p)) && !ts.isArrowFunction(p)) return false;
    if (ts.isMethodDeclaration(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p) || ts.isConstructorDeclaration(p) || ts.isPropertyDeclaration(p)) return p.parent === cls;
    p = p.parent;
  }
  return false;
}

console.log(`${changed} files ${dry ? 'would change' : 'changed'}`);
if (problems.length) console.log(`check by hand:\n  ${[...new Set(problems)].join('\n  ')}`);
