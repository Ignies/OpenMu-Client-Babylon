import { describe, expect, it } from 'vitest';
import {
  heartbeatDue,
  LOW_VITAL_MAX_PERCENT,
  LOW_VITAL_MIN_PERCENT,
  lowVitalThreshold,
  NO_WARNING,
  vitalWarning,
} from './lowVitals';

describe('heartbeatDue', () => {
  it('beats alive and under a fifth of the bar only', () => {
    expect(heartbeatDue(19, 100)).toBe(true);
    expect(heartbeatDue(1, 100)).toBe(true);
    expect(heartbeatDue(20, 100)).toBe(false);
    expect(heartbeatDue(100, 100)).toBe(false);
  });

  it('stays quiet dead or before the bar is known', () => {
    expect(heartbeatDue(0, 100)).toBe(false);
    expect(heartbeatDue(-5, 100)).toBe(false);
    expect(heartbeatDue(0, 0)).toBe(false);
    expect(heartbeatDue(10, 0)).toBe(false);
  });
});

describe('lowVitalThreshold', () => {
  it('clamps into the slider range and falls back on rubbish', () => {
    expect(lowVitalThreshold(30)).toBeCloseTo(0.3);
    expect(lowVitalThreshold(0)).toBeCloseTo(LOW_VITAL_MIN_PERCENT / 100);
    expect(lowVitalThreshold(90)).toBeCloseTo(LOW_VITAL_MAX_PERCENT / 100);
    expect(lowVitalThreshold(Number.NaN)).toBeCloseTo(0.3);
  });
});

describe('vitalWarning', () => {
  it('draws nothing above the threshold', () => {
    expect(vitalWarning(1, 30)).toEqual(NO_WARNING);
    expect(vitalWarning(0.31, 30)).toEqual(NO_WARNING);
    expect(vitalWarning(0.3, 30)).toEqual(NO_WARNING);
  });

  it('clears at an empty bar: death is not a warning', () => {
    expect(vitalWarning(0, 30)).toEqual(NO_WARNING);
    expect(vitalWarning(-1, 30)).toEqual(NO_WARNING);
    expect(vitalWarning(Number.NaN, 30)).toEqual(NO_WARNING);
  });

  it('lights up the moment the threshold is crossed', () => {
    const just = vitalWarning(0.299, 30);
    expect(just.strength).toBeGreaterThan(0.3);
    expect(just.beatSeconds).toBe(0);
  });

  it('burns harder the lower the bar goes', () => {
    const high = vitalWarning(0.25, 30).strength;
    const low = vitalWarning(0.05, 30).strength;

    expect(low).toBeGreaterThan(high);
    expect(low).toBeLessThanOrEqual(1);
  });

  it('starts beating under half the threshold and speeds up', () => {
    expect(vitalWarning(0.2, 30).beatSeconds).toBe(0);

    const slow = vitalWarning(0.14, 30).beatSeconds;
    const fast = vitalWarning(0.02, 30).beatSeconds;

    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(0);
    expect(fast).toBeLessThan(slow);
  });

  it('moves the whole curve with the option', () => {
    expect(vitalWarning(0.4, 30)).toEqual(NO_WARNING);
    expect(vitalWarning(0.4, 50).strength).toBeGreaterThan(0);

    // 20 % of a 50 % threshold is under half of it, so it beats; the same
    // health against a 30 % threshold is still steady.
    expect(vitalWarning(0.2, 50).beatSeconds).toBeGreaterThan(0);
    expect(vitalWarning(0.2, 30).beatSeconds).toBe(0);
  });

  it('keeps both numbers on their steps', () => {
    for (let hp = 1; hp <= 30; hp++) {
      const { strength, beatSeconds } = vitalWarning(hp / 100, 30);

      expect(Math.round(strength * 100)).toBeCloseTo(strength * 100, 6);
      expect(Math.round(beatSeconds * 20)).toBeCloseTo(beatSeconds * 20, 6);
    }
  });
});
