// The import graph (src/ and versions/ unless told otherwise): every resolved module edge.
import ts from 'typescript';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { posix } from 'path';
import { specifiers } from '../restructure/plan';

export type Edge = { from: string; to: string; spec: string };

const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx', '.json'];

export function trackedFiles(roots: string[]): string[] {
  return execSync(`git ls-files -co --exclude-standard ${roots.join(' ')}`, { encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\n')
    .filter(f => f && existsSync(f));
}

function resolve(from: string, spec: string, known: Set<string>): string | null {
  let base: string | null = null;
  if (spec.startsWith('.')) base = posix.normalize(posix.join(posix.dirname(from), spec)).replace(/\/$/, '');
  else if (spec.startsWith('@/')) base = 'src/' + spec.slice(2);
  else if (spec.startsWith('@versions/')) base = 'versions/' + spec.slice(10);
  if (base === null) return null;
  for (const e of EXTS) if (known.has(base + e)) return base + e;
  return null;
}

/** Static imports that load at run time: `import type`, `export type` and all-type named imports are skipped. */
export function runtimeSpecifiers(path: string, text: string): string[] {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  for (const s of sf.statements) {
    if (ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier)) {
      const clause = s.importClause;
      const named = clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : null;
      const typeOnly = clause?.isTypeOnly || (clause && !clause.name && named && named.length > 0 && named.every(e => e.isTypeOnly));
      if (!typeOnly) out.push(s.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(s) && s.moduleSpecifier && ts.isStringLiteral(s.moduleSpecifier) && !s.isTypeOnly) {
      out.push(s.moduleSpecifier.text);
    }
  }
  return out;
}

export function importGraph(roots = ['src', 'versions'], read: (path: string, text: string) => string[] = (p, t) => specifiers(p, t).map(s => s.spec)): Edge[] {
  const files = trackedFiles(roots);
  const known = new Set(files);
  const edges: Edge[] = [];
  for (const f of files) {
    if (!/\.(ts|tsx)$/.test(f) || /Packets\.ts$/.test(f)) continue;
    for (const spec of read(f, readFileSync(f, 'utf8'))) {
      const to = resolve(f, spec, known);
      if (to) edges.push({ from: f, to, spec });
    }
  }
  return edges;
}
