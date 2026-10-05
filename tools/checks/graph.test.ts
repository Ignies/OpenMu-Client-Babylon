import { describe, expect, it } from 'vitest';
import { cycles, runtimeSpecifiers } from './graph';

const edges = (...pairs: string[]) => pairs.map(p => p.split('>')).map(([from, to]) => ({ from, to }));

describe('cycles', () => {
  it('finds none in a chain', () => {
    expect(cycles(edges('a>b', 'b>c'))).toEqual([]);
  });

  it('groups each cycle once, biggest first', () => {
    expect(cycles(edges('d>e', 'e>d', 'a>b', 'b>c', 'c>a', 'c>d'))).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
    ]);
  });

  it('merges cycles that share a file', () => {
    expect(cycles(edges('a>b', 'b>a', 'b>c', 'c>b'))).toEqual([['a', 'b', 'c']]);
  });

  it('walks a long cycle without running out of stack', () => {
    const n = 20000;
    const ring = Array.from({ length: n }, (_, i) => ({ from: `f${i}`, to: `f${(i + 1) % n}` }));
    expect(cycles(ring)[0]).toHaveLength(n);
  });
});

describe('runtimeSpecifiers', () => {
  it('skips type-only imports and exports, keeps the rest', () => {
    const text = [
      "import type { A } from './typesOnly';",
      "import { type B, type C } from './inlineTypes';",
      "import { type D, e } from './mixed';",
      "import './sideEffect';",
      "export * from './all';",
      "export type { F } from './typeExport';",
    ].join('\n');
    expect(runtimeSpecifiers('x.ts', text)).toEqual(['./mixed', './sideEffect', './all']);
  });
});
