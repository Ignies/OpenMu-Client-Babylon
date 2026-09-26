import { beforeEach, describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '../common/types';
import {
  MELT_EDGE,
  MELT_LOBE_2,
  MELT_LOBE_3,
  MELT_LOBE_5,
  MELT_SPOTS,
  meltSnow,
  snowMeltCount,
  snowMeltLayer,
  snowMeltUniform,
} from './snowMelt';

const step = (dt: number) => snowMeltLayer.update?.(ENUM_WORLD.WD_2DEVIAS, dt);

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const fract = (v: number) => v - Math.floor(v);

/** The terrain shader's melt loop (terrainOverlay.ts), slot for slot. */
function shaderMelt(
  u: readonly number[],
  count: number,
  x: number,
  z: number
): number {
  let melt = 0;

  for (let m = 0; m < MELT_SPOTS; m++) {
    if (m >= count) break;
    const [sx, sz, radius, w] = u.slice(m * 4, m * 4 + 4);
    const r = Math.max(radius, 0.001);
    const vx = x - sx;
    const vz = z - sz;
    const s =
      fract(Math.sin(sx * 12.9898 + sz * 78.233) * 43758.5453) * 6.2831853;
    const a = Math.atan2(vz, vx);
    const k =
      1 +
      MELT_LOBE_2 * Math.sin(a * 2 + s) +
      MELT_LOBE_3 * Math.sin(a * 3 + s * 1.7) +
      MELT_LOBE_5 * Math.sin(a * 5 + s * 2.3);
    const d = Math.sqrt(vx * vx + vz * vz) / (r * k);

    melt = Math.max(melt, w * (1 - smoothstep(MELT_EDGE, 1, d)));
  }

  return melt;
}

/** Both packings of the same frame, copied out of the shared array. */
function packs(on = true) {
  const wide = [...snowMeltUniform(on)];
  const wideCount = snowMeltCount();
  const packed = [...snowMeltUniform(on, true)];

  return { wide, wideCount, packed, packedCount: snowMeltCount() };
}

/**
 * Slot 0 opened this frame (claimed, but its envelope still uploads 0), slot
 * 1 healed where it last burned, slots 2 and 3 closing.
 */
function scatter(): void {
  meltSnow(10, 10, 2.5);
  meltSnow(20, 12, 3);
  step(20);
  meltSnow(14, 22, 2, 0.8);
  meltSnow(30, 28, 3.5);
  step(14);
  meltSnow(12, 11, 1.5);
}

beforeEach(() => snowMeltLayer.reset?.());

describe('snow melt uniform', () => {
  it('keeps the old slot layout when not packing', () => {
    scatter();
    const { wide, wideCount } = packs();

    expect(wideCount).toBe(MELT_SPOTS);
    expect(wide.slice(0, 4)).toEqual([12, 11, 1.5, 0]);
    expect(wide.slice(4, 8)).toEqual([20, 12, 3, 0]);
    expect(wide.slice(8, 11)).toEqual([14, 22, 2]);
    expect(wide[11]).toBeGreaterThan(0);
    expect(wide.slice(12, 15)).toEqual([30, 28, 3.5]);
    expect(wide[15]).toBeGreaterThan(0);
    for (let m = 4; m < MELT_SPOTS; m++) expect(wide[m * 4 + 3]).toBe(0);
  });

  it('packs the live patches at the front and zeroes the rest', () => {
    scatter();
    const { wide, packed, packedCount } = packs();

    expect(packedCount).toBe(2);
    expect(packed.slice(0, 4)).toEqual(wide.slice(8, 12));
    expect(packed.slice(4, 8)).toEqual(wide.slice(12, 16));
    expect(packed.slice(8).every(v => v === 0)).toBe(true);

    step(0.25);
    const next = packs();
    expect(next.packedCount).toBe(3);
    expect(next.packed.slice(0, 4)).toEqual(next.wide.slice(0, 4));
  });

  it('reads zero slots with nothing burning or the effects off', () => {
    expect(packs().packedCount).toBe(0);

    scatter();
    const off = packs(false);
    expect(off.packedCount).toBe(0);
    expect(off.packed.every(v => v === 0)).toBe(true);
    expect(off.wideCount).toBe(MELT_SPOTS);
    for (let m = 0; m < MELT_SPOTS; m++) expect(off.wide[m * 4 + 3]).toBe(0);
  });

  it('gives the shader loop the same melt, packed or not', () => {
    for (const frames of [0, 1, 3, 40, 80]) {
      snowMeltLayer.reset?.();
      scatter();
      for (let f = 0; f < frames; f++) step(0.25);

      const { wide, wideCount, packed, packedCount } = packs();
      const differs: [number, number][] = [];
      let melted = 0;

      for (let x = 4; x < 36; x += 0.37) {
        for (let z = 4; z < 34; z += 0.41) {
          const old = shaderMelt(wide, wideCount, x, z);
          if (shaderMelt(packed, packedCount, x, z) !== old)
            differs.push([x, z]);
          if (old > 0) melted++;
        }
      }

      expect(differs).toEqual([]);
      // Something is open in every case, so the comparison is not vacuous.
      expect(melted).toBeGreaterThan(0);
    }
  });
});
