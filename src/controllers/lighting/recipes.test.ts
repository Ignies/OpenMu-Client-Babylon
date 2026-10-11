import { describe, expect, it } from 'vitest';
import { effectLight } from './recipes';

describe('effectLight', () => {
  it('keeps the tint hue at full strength', () => {
    const r = effectLight([0.5, 0.25, 0], 2, 1);
    expect(r.color).toEqual([1, 0.5, 0]);
  });

  it('reaches past a bigger effect and burns brighter, up to a ceiling', () => {
    const small = effectLight([1, 1, 1], 1, 1);
    const big = effectLight([1, 1, 1], 4, 1);
    const huge = effectLight([1, 1, 1], 40, 1);
    expect(big.range).toBeGreaterThan(small.range);
    expect(big.gain!).toBeGreaterThan(small.gain!);
    expect(huge.gain).toBe(2);
  });

  it('never lights less than a tile and a half', () => {
    expect(effectLight([1, 1, 1], 0.2, 1).range).toBe(1.5);
  });
});
