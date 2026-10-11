import { afterEach, describe, expect, it } from 'vitest';
import { GameOptions, defaultGameOption, setGameOption } from '@/controllers/settings';
import type { Entity } from '../world';
import { gearEffectsShown, petShown } from './othersShown';

const hero: Entity = { localPlayer: true, playerAnimation: {} as Entity['playerAnimation'] };
const other: Entity = { playerAnimation: {} as Entity['playerAnimation'] };
const monster: Entity = { npcType: 3 };

afterEach(() => {
  setGameOption('otherGearEffects', defaultGameOption('otherGearEffects'));
  setGameOption('otherPets', defaultGameOption('otherPets'));
});

describe('other players crowd options', () => {
  it('show everything by default', () => {
    expect(GameOptions.otherGearEffects && GameOptions.otherPets).toBe(true);
    expect(gearEffectsShown(other)).toBe(true);
    expect(petShown(other, 'follower')).toBe(true);
  });

  it('hide only other players gear effects', () => {
    setGameOption('otherGearEffects', false);
    expect(gearEffectsShown(other)).toBe(false);
    expect(gearEffectsShown(hero)).toBe(true);
    expect(gearEffectsShown(monster)).toBe(true);
  });

  it('hide other players pets and raven, never a ridden mount', () => {
    setGameOption('otherPets', false);
    expect(petShown(other, 'follower')).toBe(false);
    expect(petShown(other, 'raven')).toBe(false);
    expect(petShown(other, 'angel')).toBe(false);
    expect(petShown(other, 'mount')).toBe(true);
    expect(petShown(hero, 'follower')).toBe(true);
  });
});
