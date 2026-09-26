import { describe, expect, it } from 'vitest';
import { SOUND_FILES } from '../../sound/recipes';
import {
  THUNDER_SOUNDS,
  nextThunderSeconds,
  thunderSound,
  thunderStrikes,
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
    expect(thunderStrikes(0, () => 0.9)).toBe(false);
    expect(thunderStrikes(1, () => 0.9)).toBe(false);
  });

  it('strikes nothing when the pillar draw comes up zero', () => {
    expect(thunderStrikes(5, () => 0)).toBe(false);
    expect(thunderStrikes(5, () => 0.19)).toBe(false);
    expect(thunderStrikes(5, () => 0.2)).toBe(true);
  });

  it('strikes (visible - 1) / visible of the landed rolls', () => {
    const random = seeded(11);
    const rolls = 20000;
    let strikes = 0;
    for (let i = 0; i < rolls; i++) if (thunderStrikes(10, random)) strikes++;
    expect(strikes / rolls).toBeGreaterThan(0.88);
    expect(strikes / rolls).toBeLessThan(0.92);
  });

  it('picks one of the two catalogued thunder waves', () => {
    expect(thunderSound(() => 0.2)).toBe('Sound/eElec1');
    expect(thunderSound(() => 0.7)).toBe('Sound/eElec2');
    for (const key of THUNDER_SOUNDS) expect(key in SOUND_FILES).toBe(true);
  });
});
