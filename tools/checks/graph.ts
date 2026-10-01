// The import graph of src/ and versions/: every resolved module edge.
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

export function importGraph(): Edge[] {
  const files = trackedFiles(['src', 'versions']);
  const known = new Set(files);
  const edges: Edge[] = [];
  for (const f of files) {
    if (!/\.(ts|tsx)$/.test(f) || /Packets\.ts$/.test(f)) continue;
    for (const s of specifiers(f, readFileSync(f, 'utf8'))) {
      const to = resolve(f, s.spec, known);
      if (to) edges.push({ from: f, to, spec: s.spec });
    }
  }
  return edges;
}
