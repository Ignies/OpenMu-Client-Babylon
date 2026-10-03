// Points every import of a controller's inner file (from outside that controller) at the controller's
// public door, `@/controllers/<name>`, and adds the imported names to that index.ts.
// An interface widget folder (`interface/components/<widget>/`) is its own door.
// Usage: bun tools/restructure/facadeImports.ts <controller> [--dry-run]
import ts from 'typescript';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { posix } from 'path';
import { trackedFiles } from '../checks/graph';

const [controller] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const dry = process.argv.includes('--dry-run');
if (!controller) throw new Error('usage: facadeImports.ts <controller> [--dry-run]');
const ROOT = `src/controllers/${controller}`;
const EXEMPT = /^src\/controllers\/render\/babylon\/|\/scenes\/testScene\.ts$/;

const norm = (p: string) => p.replace(/\\/g, '/').replace(/^.*?(?=src\/|versions\/)/, '');
const config = ts.parseJsonConfigFileContent(ts.readConfigFile('tsconfig.json', ts.sys.readFile).config, ts.sys, '.');
const program = ts.createProgram(trackedFiles(['src', 'versions']).filter(f => /\.tsx?$/.test(f)), config.options);
const checker = program.getTypeChecker();

/** The door for a file inside the controller: its widget folder's index, or the controller's index. */
function doorOf(file: string): { index: string; spec: string } {
  const w = file.match(new RegExp(`^(${ROOT}/components/[^/]+)/`));
  if (w) {
    const index = ['index.tsx', 'index.ts'].map(n => `${w[1]}/${n}`).find(existsSync) ?? `${w[1]}/index.ts`;
    return { index, spec: '@/' + w[1].slice(4) };
  }
  return { index: existsSync(`${ROOT}/index.tsx`) ? `${ROOT}/index.tsx` : `${ROOT}/index.ts`, spec: `@/controllers/${controller}` };
}

const original = (s: ts.Symbol) => (s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);

type Add = { from: string; name: string; type: boolean };
const additions = new Map<string, Add[]>();
const exportedBy = new Map<string, Map<string, ts.Symbol>>();
function indexExports(index: string): Map<string, ts.Symbol> {
  if (exportedBy.has(index)) return exportedBy.get(index)!;
  const map = new Map<string, ts.Symbol>();
  const sf = program.getSourceFile(index);
  const mod = sf && checker.getSymbolAtLocation(sf);
  if (mod) for (const e of checker.getExportsOfModule(mod)) map.set(e.name, original(e));
  exportedBy.set(index, map);
  return map;
}

const problems: string[] = [];
const edits = new Map<string, [number, number, string][]>();
let rewritten = 0;

for (const sf of program.getSourceFiles()) {
  const file = norm(sf.fileName);
  if (!/^(src|versions)\//.test(file) || file.startsWith(ROOT + '/') || /\.test\.tsx?$/.test(file) || EXEMPT.test(file)) continue;
  for (const st of sf.statements) {
    const isImport = ts.isImportDeclaration(st);
    if (!(isImport || ts.isExportDeclaration(st)) || !st.moduleSpecifier || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const target = (st.moduleSpecifier as ts.StringLiteral);
    const resolved = ts.resolveModuleName(target.text, sf.fileName, config.options, ts.sys).resolvedModule;
    if (!resolved || resolved.isExternalLibraryImport) continue;
    const to = norm(resolved.resolvedFileName);
    if (!to.startsWith(ROOT + '/') || EXEMPT.test(to)) continue;
    const door = doorOf(to);
    if (to === door.index) continue;

    const clause = isImport ? (st as ts.ImportDeclaration).importClause : undefined;
    const named = isImport ? clause?.namedBindings : (st as ts.ExportDeclaration).exportClause;
    if (isImport && (!clause || clause.name || (named && !ts.isNamedImports(named)))) {
      problems.push(`${file}: default, namespace or side-effect import of ${to}`);
      continue;
    }
    if (!isImport && (!named || !ts.isNamedExports(named))) {
      problems.push(`${file}: export * from ${to}`);
      continue;
    }
    const elements = (named as ts.NamedImports | ts.NamedExports).elements;
    const allType = isImport ? !!clause!.isTypeOnly : (st as ts.ExportDeclaration).isTypeOnly;
    const exports = indexExports(door.index);
    let ok = true;
    for (const el of elements) {
      const name = (el.propertyName ?? el.name).text;
      const sym = checker.getSymbolAtLocation(el.propertyName ?? el.name);
      const real = sym ? original(sym) : undefined;
      const has = exports.get(name);
      if (has && real && has !== real) {
        problems.push(`${file}: ${name} from ${to} clashes with another ${name} in ${door.index}`);
        ok = false;
        continue;
      }
      if (!has && real) {
        exports.set(name, real);
        const list = additions.get(door.index) ?? [];
        list.push({ from: to, name, type: allType || el.isTypeOnly || !(real.flags & ts.SymbolFlags.Value) });
        additions.set(door.index, list);
      }
    }
    if (!ok) continue;
    const list = edits.get(file) ?? [];
    list.push([target.getStart(sf) + 1, target.getEnd() - 1, door.spec]);
    edits.set(file, list);
    rewritten++;
  }
}

for (const [file, list] of edits) {
  const raw = readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  // Offsets are into the file as TypeScript read it (raw), so edit raw, from the end.
  let t = raw;
  for (const [a, b, r] of list.sort((x, y) => y[0] - x[0])) t = t.slice(0, a) + r + t.slice(b);
  if (!dry) writeFileSync(file, crlf ? t.replace(/\r?\n/g, '\r\n') : t);
}

for (const [index, list] of additions) {
  const byFrom = new Map<string, Add[]>();
  for (const a of list) (byFrom.get(a.from) ?? byFrom.set(a.from, []).get(a.from)!).push(a);
  const lines: string[] = [];
  for (const [from, adds] of [...byFrom].sort()) {
    let rel = posix.relative(posix.dirname(index), from).replace(/\.tsx?$/, '').replace(/\/index$/, '');
    if (!rel.startsWith('.')) rel = './' + rel;
    const values = adds.filter(a => !a.type).map(a => a.name).sort();
    const types = adds.filter(a => a.type).map(a => a.name).sort();
    if (values.length) lines.push(`export { ${values.join(', ')} } from '${rel}';`);
    if (types.length) lines.push(`export type { ${types.join(', ')} } from '${rel}';`);
  }
  const header = `// Public API of the ${controller} controller: code outside this folder imports from here.\n`;
  const before = existsSync(index) ? readFileSync(index, 'utf8') : header;
  const crlf = before.includes('\r\n');
  const text = before.replace(/\r\n/g, '\n').trimEnd() + '\n\n' + lines.join('\n') + '\n';
  if (!dry) writeFileSync(index, crlf ? text.replace(/\n/g, '\r\n') : text);
  console.log(`${index}: +${list.length} exports`);
}
console.log(`${rewritten} imports pointed at the door${dry ? ' (dry run)' : ''}`);
if (problems.length) console.log('left as they are:\n  ' + [...new Set(problems)].join('\n  '));
