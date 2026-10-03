import { describe, expect, it, vi } from 'vitest';
import { PlayerAction } from '@versions/shared/objects/enum';
import type { World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The hero's server speeds (CharacterInformation / CurrentStatsExtended).
vi.mock('../../app/store', () => ({
  Store: { playerData: { attackSpeed: 600, magicSpeed: 900, charClass: 0, agi: 0 } },
}));

const { AnimationSystem } = await import('./animationSystem');

function attributes(values: Record<string, number>) {
  const v = new Map(Object.entries(values));
  return {
    getValue: (k: string) => v.get(k) ?? 0,
    setValue: (k: string, n: number) => void v.set(k, n),
    isAboveZero: (k: string) => (v.get(k) ?? 0) > 0,
  };
}

function player(localPlayer: boolean) {
  return {
    localPlayer: localPlayer || undefined,
    playerAnimation: { action: PlayerAction.PLAYER_STOP_MALE, run: 0 },
    modelObject: { HoverHeight: 0 },
    // A remote player's own speeds, as the extended scope packet would carry them.
    attributeSystem: attributes({ attackSpeed: 20, magicSpeed: 30 }),
    movement: { velocity: { x: 0, y: 0 } },
    transform: { pos: { x: 10, y: 0, z: 10 } },
  };
}

describe('player clip speeds', () => {
  it("play every player body at the hero's attack and magic speed (SetAttackSpeed, ZzzCharacter.cpp:812)", () => {
    const hero = player(true);
    const other = player(false);
    const world = {
      with: (...c: string[]) => (c.includes('attributeSystem') ? [hero, other] : []),
      mapIndex: 0,
      getTerrainFlag: () => 0,
    };
    AnimationSystem(world as unknown as World).update!(1 / 25);
    for (const p of [hero, other]) {
      expect(p.attributeSystem.getValue('attackSpeed')).toBe(600);
      expect(p.attributeSystem.getValue('magicSpeed')).toBe(900);
    }
  });
});
