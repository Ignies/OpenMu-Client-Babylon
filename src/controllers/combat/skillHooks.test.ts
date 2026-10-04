import { afterEach, describe, expect, it } from 'vitest';
import { combat } from '.';
import { skillHooks } from './skillHooks';

// An empty slot answers "nothing happening": the Dark Side drain loop in skillCastSystem stops on -1.
describe('empty skill hook slots', () => {
  const saved = skillHooks.darkSide;
  afterEach(() => {
    skillHooks.darkSide = saved;
  });

  it('have no Dark Side follow-up due', () => {
    skillHooks.darkSide = undefined;
    expect(combat.nextDarkSideHit()).toBe(-1);
  });
});
