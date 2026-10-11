import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameOptions, defaultGameOption, setGameOption } from '@/controllers/settings';
import type { Entity } from '../world';
import { animationsHeld, gearEffectsShown, petShown } from './othersShown';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const hero: Entity = { localPlayer: true, playerAnimation: {} as Entity['playerAnimation'] };
const other: Entity = { playerAnimation: {} as Entity['playerAnimation'] };
const monster: Entity = { npcType: 3 };
/** 240 is Baz the Vault Keeper, 100 a Lance Trap. */
const npc: Entity = { npcType: 240 };
const trap: Entity = { npcType: 100 };

afterEach(() => {
  setGameOption('otherGearEffects', defaultGameOption('otherGearEffects'));
  setGameOption('otherPets', defaultGameOption('otherPets'));
  setGameOption('otherPlayerAnimations', defaultGameOption('otherPlayerAnimations'));
  setGameOption('npcAnimations', defaultGameOption('npcAnimations'));
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

describe('animations held still', () => {
  it('holds nothing by default', () => {
    for (const e of [hero, other, monster, npc, trap]) expect(animationsHeld(e)).toBe(false);
  });

  it('holds other players, never the hero', () => {
    setGameOption('otherPlayerAnimations', false);
    expect(animationsHeld(other)).toBe(true);
    expect(animationsHeld(hero)).toBe(false);
    expect(animationsHeld(npc)).toBe(false);
  });

  it('holds the NPCs, never a monster or a trap', () => {
    setGameOption('npcAnimations', false);
    expect(animationsHeld(npc)).toBe(true);
    expect(animationsHeld(monster)).toBe(false);
    expect(animationsHeld(trap)).toBe(false);
    expect(animationsHeld(other)).toBe(false);
  });
});
