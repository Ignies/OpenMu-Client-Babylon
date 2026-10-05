import { afterEach, describe, expect, it } from 'vitest';
import { combat } from '.';
import { skillHooks } from './skillHooks';

// An empty slot answers "nothing happening".
describe('empty skill hook slots', () => {
  const saved = skillHooks.darkSide;
  afterEach(() => {
    skillHooks.darkSide = saved;
  });

  it('know no Dark Side and no Rage streak', () => {
    skillHooks.darkSide = undefined;
    expect(combat.isDarkSide(263)).toBe(false);
    expect(combat.observeDarkSideEcho(263, {} as never)).toBe(false);
    expect(combat.rageStreak).toBe(0);
  });
});
