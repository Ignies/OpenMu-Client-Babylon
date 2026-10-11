import { describe, expect, it, vi } from 'vitest';
import type { Gear } from '../../controllers/actors';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { gearKeyChanged } = await import('./itemGlowSystem');

const sword = { group: 0, num: 5, lvl: 9 };

describe('gearKeyChanged', () => {
  it('reports a change only when what the lamp reads changes', () => {
    const key: number[] = [];
    const gear: Gear = { rightHand: { ...sword } } as Gear;

    expect(gearKeyChanged(key, gear, 1, true)).toBe(true);
    expect(gearKeyChanged(key, gear, 1, true)).toBe(false);

    gear.rightHand = { ...sword, lvl: 11 };
    expect(gearKeyChanged(key, gear, 1, true)).toBe(true);

    gear.rightHand = { ...sword, lvl: 11, isExcellent: true };
    expect(gearKeyChanged(key, gear, 1, true)).toBe(true);

    gear.rightHand = { ...sword, lvl: 11, isExcellent: true, socketCount: 2 };
    expect(gearKeyChanged(key, gear, 1, true)).toBe(true);

    // A re-apply of the same gear (a warp) and the gear-effects switch count too.
    expect(gearKeyChanged(key, gear, 2, true)).toBe(true);
    expect(gearKeyChanged(key, gear, 2, false)).toBe(true);
    expect(gearKeyChanged(key, gear, 2, false)).toBe(false);
  });

  it('tells an empty slot from a piece moved to another slot', () => {
    const key: number[] = [];
    expect(gearKeyChanged(key, { rightHand: sword } as Gear, 0, true)).toBe(true);
    expect(gearKeyChanged(key, { leftHand: sword } as Gear, 0, true)).toBe(true);
    expect(gearKeyChanged(key, {} as Gear, 0, true)).toBe(true);
  });
});

// Infinity Arrow on Skill effects: Original: the bolts in a hand turn gold while the buff holds (ZzzObject.cpp:8023-8030).
describe('the Infinity Arrow quiver', () => {
  it('is painted gold on Original while the buff holds, and not on Enhanced', async () => {
    const { ItemGlowSystem } = await import('./itemGlowSystem');
    const { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } = await import('@/controllers/fidelity');
    await import('@versions/shared/improvements/all');
    const meshes = [{ metadata: { bodyLight: 'plain' } }];
    const part = { gltf: {}, getMeshes: () => meshes };
    const none = { gltf: null, getMeshes: () => [] };
    const hero = {
      buffs: new Set([6]),
      charAppearance: { leftHand: { group: 4, num: 7 }, applied: 1 },
      modelObject: { Weapon1: part, Weapon2: none, SelfLight: { setAll() {} } },
      transform: { pos: { x: 0, y: 0, z: 0 } },
    };
    const list = (items: unknown[]) => Object.assign(items, { onEntityRemoved: { subscribe() {} } });
    const world = {
      with: (...keys: string[]) => list(keys.includes('droppedItem') ? [] : [hero]),
      gameTime: { TotalGameTime: { TotalSeconds: 0 } },
      scene: null,
      mapIndex: 0,
    };
    const system = ItemGlowSystem(world as never);
    try {
      setFidelityChoice(FIDELITY_CLASSIC, {});
      system.update?.(0 as never);
      expect(meshes[0].metadata.bodyLight).not.toBe('plain');
      setFidelityChoice(FIDELITY_DEFAULT, {});
      system.update?.(0 as never);
      expect(meshes[0].metadata.bodyLight).toBe('plain');
      setFidelityChoice(FIDELITY_CLASSIC, {});
      system.update?.(0 as never);
      expect(meshes[0].metadata.bodyLight).not.toBe('plain');
      hero.buffs.clear();
      system.update?.(0 as never);
      expect(meshes[0].metadata.bodyLight).toBe('plain');
    } finally {
      setFidelityChoice(FIDELITY_DEFAULT, {});
    }
  });
});
