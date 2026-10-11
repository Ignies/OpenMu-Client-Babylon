import { afterEach, describe, expect, it } from 'vitest';
import { defaultGameOption, setGameOption } from '@/controllers/settings';
import type { Entity } from '@/ecs/world';
import { CASTER_GAP_MS, HEAVY_VISUAL_GAP, OTHERS_PER_SECOND, castIsDrawn } from './castBudget';

const hero = (): Entity => ({ localPlayer: true, playerAnimation: {} as Entity['playerAnimation'] });
const other = (): Entity => ({ playerAnimation: {} as Entity['playerAnimation'] });
const monster = (): Entity => ({ npcType: 3 });

/** Each test casts on its own stretch of the clock, so the shared one-second window starts fresh. */
let clock = 0;
const later = (): number => (clock += 100_000);

afterEach(() => {
  setGameOption('otherSkillEffects', defaultGameOption('otherSkillEffects'));
  setGameOption('skillVisualBudget', defaultGameOption('skillVisualBudget'));
});

describe('castIsDrawn', () => {
  it('draws every cast by default, however fast', () => {
    const t = later();
    const caster = other();
    for (let i = 0; i < 200; i++) expect(castIsDrawn(caster, 0, t + i)).toBe(true);
  });

  it('leaves out other players casts when their effects are off', () => {
    setGameOption('otherSkillEffects', false);
    const t = later();
    expect(castIsDrawn(other(), 0, t)).toBe(false);
    expect(castIsDrawn(hero(), 0, t)).toBe(true);
    expect(castIsDrawn(monster(), 0, t)).toBe(true);
  });
});

describe('the skill visual budget', () => {
  it('draws one cast per caster gap, the hero too', () => {
    setGameOption('skillVisualBudget', true);
    const t = later();
    const me = hero();
    // 20 casts a second for a second.
    let drawn = 0;
    for (let ms = 0; ms < 1000; ms += 50) if (castIsDrawn(me, 0, t + ms)) drawn++;
    expect(drawn).toBe(1000 / CASTER_GAP_MS);
  });

  it('never thins a caster under the gap (a normal attack speed)', () => {
    setGameOption('skillVisualBudget', true);
    const t = later();
    const caster = other();
    for (let ms = 0; ms < 2000; ms += CASTER_GAP_MS) expect(castIsDrawn(caster, 0, t + ms)).toBe(true);
  });

  it('gives a heavy skill its own longer gap', () => {
    setGameOption('skillVisualBudget', true);
    HEAVY_VISUAL_GAP[9999] = 0.5;
    const t = later();
    const caster = other();
    expect(castIsDrawn(caster, 9999, t)).toBe(true);
    expect(castIsDrawn(caster, 9999, t + 300)).toBe(false);
    expect(castIsDrawn(caster, 9999, t + 500)).toBe(true);
    delete HEAVY_VISUAL_GAP[9999];
  });

  it('shares a budget per second among other players, not the hero', () => {
    setGameOption('skillVisualBudget', true);
    const t = later();
    const crowd = Array.from({ length: 100 }, other);
    expect(crowd.filter(p => castIsDrawn(p, 0, t)).length).toBe(OTHERS_PER_SECOND);
    expect(castIsDrawn(hero(), 0, t)).toBe(true);
    expect(castIsDrawn(other(), 0, t + 1000)).toBe(true);
  });
});
