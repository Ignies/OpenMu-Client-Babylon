import { afterEach, describe, expect, it } from 'vitest';
import { defaultGameOption, setGameOption } from '@/controllers/settings';
import type { Entity } from '@/ecs/world';
import { castIsDrawn } from './castBudget';

const hero = (): Entity => ({ localPlayer: true, playerAnimation: {} as Entity['playerAnimation'] });
const other = (): Entity => ({ playerAnimation: {} as Entity['playerAnimation'] });
const monster = (): Entity => ({ npcType: 3 });

afterEach(() => {
  setGameOption('otherSkillEffects', defaultGameOption('otherSkillEffects'));
});

describe('castIsDrawn', () => {
  it('draws every cast by default', () => {
    expect(castIsDrawn(other())).toBe(true);
  });

  it('leaves out other players casts when their effects are off', () => {
    setGameOption('otherSkillEffects', false);
    expect(castIsDrawn(other())).toBe(false);
    expect(castIsDrawn(hero())).toBe(true);
    expect(castIsDrawn(monster())).toBe(true);
  });
});
