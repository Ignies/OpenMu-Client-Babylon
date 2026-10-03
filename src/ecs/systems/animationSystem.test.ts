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

function player(localPlayer: boolean, speeds?: { attack: number; magic: number }) {
  return {
    localPlayer: localPlayer || undefined,
    playerAnimation: { action: PlayerAction.PLAYER_STOP_MALE, run: 0 },
    modelObject: { HoverHeight: 0 },
    // A remote player's own speeds, as the extended scope packet carries them (scope/net.ts).
    speeds,
    attributeSystem: attributes({ attackSpeed: 1, magicSpeed: 2 }),
    movement: { velocity: { x: 0, y: 0 } },
    transform: { pos: { x: 10, y: 0, z: 10 } },
  };
}

function step(...players: ReturnType<typeof player>[]): void {
  const world = {
    with: (...c: string[]) => (c.includes('attributeSystem') ? players : []),
    mapIndex: 0,
    getTerrainFlag: () => 0,
  };
  AnimationSystem(world as unknown as World).update!(1 / 25);
}

const speedsOf = (p: ReturnType<typeof player>) => [p.attributeSystem.getValue('attackSpeed'), p.attributeSystem.getValue('magicSpeed')];

describe('player clip speeds', () => {
  it("play the hero, and a player the scope packet gave no speeds, at the hero's speeds (SetAttackSpeed, ZzzCharacter.cpp:812)", () => {
    const hero = player(true, { attack: 20, magic: 30 });
    const classic = player(false);
    step(hero, classic);
    expect(speedsOf(hero)).toEqual([600, 900]);
    expect(speedsOf(classic)).toEqual([600, 900]);
  });

  it('play another player at its own speeds from the extended scope packet', () => {
    const other = player(false, { attack: 20, magic: 30 });
    step(player(true), other);
    expect(speedsOf(other)).toEqual([20, 30]);
  });
});
