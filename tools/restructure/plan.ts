import ts from 'typescript';
import { posix } from 'path';

export type Move = { from: string; to: string };
export type Plan = {
  renames: [string, string][];
  writes: Map<string, string>;
  unresolved: string[];
};

const EXTS = ['', '.ts', '.tsx', '.js', '.mjs', '.json', '.d.ts', '/index.ts', '/index.tsx', '/index.js'];
const ALIASES: [string, string][] = [
  ['@/', 'src/'],
  ['@versions/', 'versions/'],
];

/** Expands file/folder moves into a file-level old -> new map. */
export function expandMoves(files: readonly string[], moves: readonly Move[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const { from, to } of moves) {
    const hit = files.filter(f => f === from || f.startsWith(from + '/'));
    if (!hit.length) throw new Error(`move source not found: ${from}`);
    for (const f of hit) {
      if (out.has(f)) throw new Error(`file moved twice: ${f}`);
      out.set(f, to + f.slice(from.length));
    }
  }
  const targets = new Set(out.values());
  if (targets.size !== out.size) throw new Error('two files move to the same path');
  for (const f of files) if (!out.has(f) && targets.has(f)) throw new Error(`move target exists: ${f}`);
  return out;
}

/** Every module specifier in a file with its [start, end) text range, quotes excluded. */
export function specifiers(path: string, text: string): { spec: string; start: number; end: number }[] {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : path.endsWith('.js') || path.endsWith('.mjs') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, kind);
  const out: { spec: string; start: number; end: number }[] = [];
  const add = (n: ts.Node | undefined) => {
    if (n && ts.isStringLiteralLike(n)) out.push({ spec: n.text, start: n.getStart(sf) + 1, end: n.getEnd() - 1 });
  };
  const visit = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) add(n.moduleSpecifier);
    else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument)) add(n.argument.literal);
    else if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.getText(sf) : '';
      if (callee.kind === ts.SyntaxKind.ImportKeyword || name === 'require' || name === 'vi.mock' || name === 'vi.importActual') add(n.arguments[0]);
    } else if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'URL' && n.arguments?.[1]?.getText(sf) === 'import.meta.url') {
      add(n.arguments[0]);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function resolve(importer: string, spec: string, known: Set<string>): { file: string; suffix: string } | null {
  let base: string | null = null;
  if (spec.startsWith('./') || spec.startsWith('../')) base = posix.normalize(posix.join(posix.dirname(importer), spec));
  else for (const [alias, dir] of ALIASES) if (spec.startsWith(alias)) base = dir + spec.slice(alias.length);
  if (base === null) return null;
  for (const ext of EXTS) if (known.has(base + ext)) return { file: base + ext, suffix: ext };
  return null;
}

function relative(fromFile: string, toFile: string): string {
  const r = posix.relative(posix.dirname(fromFile), toFile);
  return r.startsWith('.') ? r : './' + r;
}

/** Rewrites a specifier so it points at `target` from `importer`, keeping the original style. */
function rewrite(spec: string, importer: string, target: string, suffix: string): string {
  const stem = suffix && target.endsWith(suffix) ? target.slice(0, -suffix.length) : target;
  for (const [alias, dir] of ALIASES) if (spec.startsWith(alias) && stem.startsWith(dir)) return alias + stem.slice(dir.length);
  return relative(importer, stem);
}

/**
 * Plans a batch of moves: which files to rename and the new text of every
 * file whose imports change. Pure, so it runs on an in-memory tree in tests.
 */
export function planMoves(tree: ReadonlyMap<string, string | null>, moves: readonly Move[]): Plan {
  const files = [...tree.keys()];
  const known = new Set(files);
  const map = expandMoves(files, moves);
  const to = (f: string) => map.get(f) ?? f;
  const writes = new Map<string, string>();
  const unresolved: string[] = [];
  for (const [file, text] of tree) {
    if (text === null) continue;
    let out = text;
    const specs = specifiers(file, text).sort((a, b) => b.start - a.start);
    for (const s of specs) {
      const hit = resolve(file, s.spec, known);
      if (!hit) {
        if (s.spec.startsWith('.') && !/\.(less|css|png|svg|json|glsl|wgsl|html|txt)(\?.*)?$/.test(s.spec) && !s.spec.includes('?')) unresolved.push(`${file}: ${s.spec}`);
        continue;
      }
      if (!map.has(file) && !map.has(hit.file)) continue;
      const next = rewrite(s.spec, to(file), to(hit.file), hit.suffix);
      if (next !== s.spec) out = out.slice(0, s.start) + next + out.slice(s.end);
    }
    if (out !== text || map.has(file)) writes.set(to(file), out);
  }
  return { renames: [...map.entries()], writes, unresolved };
}
