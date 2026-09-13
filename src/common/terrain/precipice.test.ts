import { describe, expect, it } from 'vitest';
import { TERRAIN_SIZE, TWFlags } from './consts';
import { TERRAIN_INDEX } from './utils';
import { buildPrecipiceField, type PrecipiceSpec } from './precipice';

const SPEC: PrecipiceSpec = { fade: 3, floor: 0 };

/** A map with one rectangular ravine in it, everything else walkable. */
function withRavine(x0: number, y0: number, x1: number, y1: number) {
  const att = new Uint16Array(TERRAIN_SIZE * TERRAIN_SIZE);

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) att[TERRAIN_INDEX(x, y)] = TWFlags.NoGround;
  }

  return att;
}

describe('buildPrecipiceField', () => {
  it('leaves a map with no NoGround tile exactly as it was', () => {
    const f = buildPrecipiceField(
      new Uint16Array(TERRAIN_SIZE * TERRAIN_SIZE),
      SPEC
    );

    expect(Math.min(...f.light)).toBe(1);
  });

  it('keeps every corner a walkable tile touches at full light', () => {
    const f = buildPrecipiceField(withRavine(100, 100, 110, 110), SPEC);

    // The rim: corners on the ravine's boundary touch ground on one side.
    for (let x = 100; x <= 111; x++) {
      expect(f.light[TERRAIN_INDEX(x, 100)]).toBe(1);
    }

    // One tile out is untouched too - the field itself never darkens.
    expect(f.light[TERRAIN_INDEX(105, 99)]).toBe(1);
    expect(f.light[TERRAIN_INDEX(99, 105)]).toBe(1);
  });

  it('takes the interior to the floor', () => {
    const f = buildPrecipiceField(withRavine(100, 100, 110, 110), SPEC);

    expect(f.light[TERRAIN_INDEX(105, 105)]).toBeCloseTo(SPEC.floor, 5);
  });

  it('fades in from the rim rather than stepping', () => {
    const f = buildPrecipiceField(withRavine(100, 100, 110, 110), SPEC);
    const at = (x: number) => f.light[TERRAIN_INDEX(x, 105)];

    expect(at(100)).toBe(1);
    expect(at(101)).toBeLessThan(1);
    expect(at(102)).toBeLessThan(at(101));
    expect(at(103)).toBeLessThanOrEqual(at(102));
  });

  it('leaves a bridge deck alone, because the strip under one is walkable', () => {
    // A ravine with a three-tile causeway across it, which is how this data
    // set builds a bridge: the span is scenery over ground that stays
    // walkable, so it is never `NoGround` and never in the fade.
    const att = withRavine(100, 100, 120, 110);
    for (let y = 100; y <= 110; y++) {
      for (let x = 109; x <= 111; x++) att[TERRAIN_INDEX(x, y)] = 0;
    }

    const f = buildPrecipiceField(att, SPEC);

    expect(f.light[TERRAIN_INDEX(110, 105)]).toBe(1);
  });
});
