import { describe, expect, it } from 'vitest';
import { uploadSpan as burnSpan } from './grassBurn';

// WebGL reads byte rows on 4-byte boundaries; a sub-rect of a one-byte texture must be whole groups.
describe('the sub-rect uploads', () => {
  for (const [name, span] of [['grass burn', burnSpan]] as const) {
    it(`widens the ${name} columns to whole groups of 4`, () => {
      expect(span(5, 7, 2048)).toEqual([4, 4]);
      expect(span(3, 9, 2048)).toEqual([0, 12]);
      expect(span(8, 8, 2048)).toEqual([8, 4]);
      expect(span(2045, 2047, 2048)).toEqual([2044, 4]);
      for (let x0 = 0; x0 < 9; x0++) for (let x1 = x0; x1 < 20; x1++) {
        const [a, w] = span(x0, x1, 2048);
        expect(a % 4).toBe(0);
        expect(w % 4).toBe(0);
        expect(a <= x0 && a + w - 1 >= x1).toBe(true);
      }
    });
  }
});
