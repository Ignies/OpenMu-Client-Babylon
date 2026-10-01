import { describe, expect, it } from 'vitest';
import { envelopeLevelAt } from './sampler';

describe('envelopeLevelAt', () => {
  const env = { startedAt: 10, attackEnd: 10.02, peak: 0.6 };

  it('is silent before the note starts, so a release scheduled ahead holds nothing stale', () => {
    expect(envelopeLevelAt(env, 9.9)).toBe(0);
    expect(envelopeLevelAt(env, 10)).toBe(0);
  });

  it('climbs the attack and holds the peak after it', () => {
    expect(envelopeLevelAt(env, 10.01)).toBeCloseTo(0.3);
    expect(envelopeLevelAt(env, 10.02)).toBe(0.6);
    expect(envelopeLevelAt(env, 12)).toBe(0.6);
  });
});
