import { describe, expect, it } from 'vitest';
import { TERRAIN_SIZE, TWFlags } from './consts';
import { TERRAIN_INDEX } from './utils';
import { buildPrecipiceField, type PrecipiceSpec } from './precipice';

const SPEC: PrecipiceSpec = {
  depth: 10,
  slope: 2,
  maskTop: -0.5,
  maskBottom: -5,
  floor: 0.02,
  bridgeParts: [],
};

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

    expect(Math.max(...f.sink)).toBe(0);
  });

  it('pins every corner a walkable tile touches, so the quads stay welded', () => {
    const f = buildPrecipiceField(withRavine(100, 100, 110, 110), SPEC);

    // The rim: corners on the ravine's boundary touch ground on one side.
    for (let x = 100; x <= 111; x++) {
      expect(f.sink[TERRAIN_INDEX(x, 100)]).toBe(0);
    }

    // One tile out is untouched too - nothing walkable ever moves.
    expect(f.sink[TERRAIN_INDEX(105, 99)]).toBe(0);
    expect(f.sink[TERRAIN_INDEX(99, 105)]).toBe(0);
  });

  it('sinks the interior to the full depth', () => {
    const f = buildPrecipiceField(withRavine(100, 100, 110, 110), SPEC);
    const middle = TERRAIN_INDEX(105, 105);

    expect(f.sink[middle]).toBeCloseTo(SPEC.depth, 5);
  });

  it('falls away from the rim rather than stepping', () => {
    const f = buildPrecipiceField(withRavine(100, 100, 110, 110), SPEC);
    const at = (x: number) => f.sink[TERRAIN_INDEX(x, 105)];

    expect(at(100)).toBe(0);
    expect(at(101)).toBeGreaterThan(0);
    expect(at(102)).toBeGreaterThan(at(101));
    expect(at(103)).toBeGreaterThanOrEqual(at(102));
  });

  it('takes the walkable strip under a bridge span down with the ravine', () => {
    // A ravine 20 tiles wide with a three-tile causeway across the middle,
    // and a row of bridge parts down each side of it.
    const att = withRavine(100, 100, 120, 110);
    for (let y = 100; y <= 110; y++) {
      for (let x = 109; x <= 111; x++) att[TERRAIN_INDEX(x, y)] = 0;
    }

    const rails = [];
    for (let y = 101; y <= 109; y += 3) {
      rails.push({ id: 12, pos: { x: 109 * 100, y: y * 100 } });
      rails.push({ id: 13, pos: { x: 111 * 100, y: y * 100 } });
    }

    const bare = buildPrecipiceField(att, SPEC, rails);
    const bridged = buildPrecipiceField(
      att,
      { ...SPEC, bridgeParts: [12, 13] },
      rails
    );

    // Without the rule the causeway is ground and stands at full height.
    expect(bare.sink[TERRAIN_INDEX(110, 105)]).toBe(0);
    expect(bridged.sink[TERRAIN_INDEX(110, 105)]).toBeCloseTo(SPEC.depth, 5);

    // The landings at either end of the span keep their ground, so the ramps
    // onto it still meet the field.
    expect(bridged.sink[TERRAIN_INDEX(110, 99)]).toBe(0);
    expect(bridged.sink[TERRAIN_INDEX(110, 112)]).toBe(0);
  });

  it('pins a ravine that reaches the map border, for the frame outside it', () => {
    const f = buildPrecipiceField(withRavine(0, 0, 6, 40), SPEC);

    // `terrainEdge` welds to these three corner rows off the height map alone.
    for (let y = 0; y <= 40; y++) {
      expect(f.sink[TERRAIN_INDEX(0, y)]).toBe(0);
      expect(f.sink[TERRAIN_INDEX(1, y)]).toBe(0);
    }

    // The ravine still cuts, one tile further in.
    expect(f.sink[TERRAIN_INDEX(4, 20)]).toBeGreaterThan(0);
  });
});
