import { describe, expect, it } from 'vitest';
import { REACH_REFRESH_MS, boxReachSq, rayMissesReach, rayPointDistanceSq } from './pointerReach';

const o = { x: 0, y: 10, z: 0 };
const down = { x: 0, y: -1, z: 0 };

describe('pointer reach', () => {
  it('measures the distance from a point to the ray, and to its origin behind it', () => {
    expect(rayPointDistanceSq(o, down, { x: 3, y: 0, z: 4 })).toBeCloseTo(25);
    expect(rayPointDistanceSq(o, { x: 0, y: -5, z: 0 }, { x: 3, y: 0, z: 4 })).toBeCloseTo(25);
    expect(rayPointDistanceSq(o, down, { x: 0, y: 12, z: 0 })).toBeCloseTo(4);
  });

  it('never skips a box the ray could touch', () => {
    const pos = { x: 5, y: 0, z: 0 };
    const min = { x: 4.4, y: 0, z: -0.6 };
    const max = { x: 5.6, y: 2, z: 0.6 };
    const reach = { r2: boxReachSq(pos, min, max), at: 0 };
    // A ray straight through the box's far corner.
    expect(rayMissesReach(reach, 10, { x: 5.6, y: 10, z: 0.6 }, down, pos)).toBe(false);
    // A ray far to the side.
    expect(rayMissesReach(reach, 10, { x: 20, y: 10, z: 0 }, down, pos)).toBe(true);
  });

  it('measures again once the reach is old or missing', () => {
    expect(rayMissesReach(undefined, 0, { x: 50, y: 10, z: 0 }, down, { x: 0, y: 0, z: 0 })).toBe(false);
    const reach = { r2: 1, at: 0 };
    expect(rayMissesReach(reach, REACH_REFRESH_MS, { x: 50, y: 10, z: 0 }, down, { x: 0, y: 0, z: 0 })).toBe(false);
  });
});
