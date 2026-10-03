import { describe, expect, it } from 'vitest';
import { SOUND_FILES } from '../../sound/recipes';
import {
  BOLT_DROP_MU,
  BOLT_SEGMENTS,
  THUNDER_SOUNDS,
  fallingBoltPath,
  nextThunderSeconds,
  thunderPillar,
  thunderSound,
} from './thunder';

/** A small LCG so the rate checks are the same on every run. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('Chaos Castle pillar thunder', () => {
  // rand_fps_check(10) at 25 fps.
  it('lands a roll every 0.4 s on average', () => {
    const random = seeded(7);
    const samples = 20000;
    let sum = 0;
    for (let i = 0; i < samples; i++) sum += nextThunderSeconds(random);
    expect(sum / samples).toBeGreaterThan(0.39);
    expect(sum / samples).toBeLessThan(0.41);
  });

  it('strikes nothing without two pillars in view', () => {
    expect(thunderPillar(0, () => 0.9)).toBe(-1);
    expect(thunderPillar(1, () => 0.9)).toBe(-1);
  });

  it('strikes nothing when the pillar draw comes up zero', () => {
    expect(thunderPillar(5, () => 0)).toBe(-1);
    expect(thunderPillar(5, () => 0.19)).toBe(-1);
    expect(thunderPillar(5, () => 0.2)).toBe(0);
  });

  it('strikes the k-th pillar in view for a draw of k', () => {
    expect(thunderPillar(5, () => 0.5)).toBe(1);
    expect(thunderPillar(5, () => 0.99)).toBe(3);
  });

  it('strikes (visible - 1) / visible of the landed rolls', () => {
    const random = seeded(11);
    const rolls = 20000;
    let strikes = 0;
    for (let i = 0; i < rolls; i++)
      if (thunderPillar(10, random) >= 0) strikes++;
    expect(strikes / rolls).toBeGreaterThan(0.88);
    expect(strikes / rolls).toBeLessThan(0.92);
  });

  it('drops the bolt out of the sky onto the pillar', () => {
    const to = { x: 30, y: 2, z: 80 };
    const from = { x: 30, y: 2 + BOLT_DROP_MU / 100, z: 80 };
    const out: number[] = [];
    fallingBoltPath(from, to, out, seeded(3));

    expect(out.length).toBe((BOLT_SEGMENTS + 1) * 3);
    // The first point is one step under the top, the last is the pillar.
    expect(out[1]).toBeCloseTo(from.y - 0.16, 5);
    expect(out.slice(-3)).toEqual([to.x, to.y, to.z]);
    // Straight down: never back up.
    for (let k = 1; k < BOLT_SEGMENTS + 1; k++) {
      expect(out[k * 3 + 1]).toBeLessThanOrEqual(out[(k - 1) * 3 + 1]);
    }
  });

  it('picks one of the two catalogued thunder waves', () => {
    expect(thunderSound(() => 0.2)).toBe('Sound/eElec1');
    expect(thunderSound(() => 0.7)).toBe('Sound/eElec2');
    for (const key of THUNDER_SOUNDS) expect(key in SOUND_FILES).toBe(true);
  });
});
