import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';
import type { Entity } from '../../ecs/world';
import type { MonsterBodyFx } from '../monsters';

// What the entry hands the glow, joint and particle entries.
const calls = vi.hoisted(() => ({
  glows: [] as unknown[],
  joints: [] as { opts: Record<string, unknown>; stop: () => void; stopped: boolean }[],
  particles: [] as unknown[][],
}));

vi.mock('../render/babylon/exports', () => {
  class Vector3 {
    constructor(public x = 0, public y = 0, public z = 0) {}
    set(x: number, y: number, z: number) {
      return Object.assign(this, { x, y, z });
    }
  }
  return { Vector3 };
});
vi.mock('./core', () => {
  class LiveList {
    items: { update(dt: number): boolean; release(): void }[] = [];
    push(item: { update(dt: number): boolean; release(): void }) {
      this.items.push(item);
      return { alive: true, stop: () => item.release() };
    }
    update(dt: number) {
      this.items = this.items.filter(i => i.update(dt) || (i.release(), false));
    }
    clear() {
      this.items = [];
    }
  }
  return {
    LiveList,
    bonePos: (_e: unknown, bone: number, out: { set(x: number, y: number, z: number): unknown }) => out.set(bone, 0, 0),
    boneLocalPos: (_e: unknown, bone: number, local: { x: number; y: number; z: number }, out: { set(x: number, y: number, z: number): unknown }) =>
      out.set(bone + local.x, local.y, local.z),
    emitBurst: () => {},
    entityGone: () => false,
    entityPos: (_e: unknown, _h: number, out: unknown) => out,
    inWindow: () => true,
  };
});
vi.mock('./monsterGlow', () => ({
  glowMonster: (_s: unknown, _e: unknown, glow: unknown) => {
    calls.glows.push(glow);
    return { alive: true, stop() {} };
  },
}));
vi.mock('./joint', () => ({
  spawnJoint: (_s: unknown, _at: unknown, opts: Record<string, unknown>) => {
    const j = { opts, stopped: false, stop: () => void (j.stopped = true) };
    calls.joints.push(j);
    return { alive: true, stop: j.stop };
  },
}));
vi.mock('./effectParticles', () => ({
  NO_TURN: { x: 0, y: 0, z: 0 },
  // The entry hands one scratch point to every spawn: keep where it was at each.
  spawnParticle: (s: unknown, kind: unknown, at: { x: number; y: number; z: number }, ...rest: unknown[]) =>
    void calls.particles.push([s, kind, { x: at.x, y: at.y, z: at.z }, ...rest]),
}));
vi.mock('./debris', () => ({ spawnDebris: () => {} }));
vi.mock('./ring', () => ({ spawnRing: () => ({ alive: true, stop() {} }) }));
vi.mock('./sprite', () => ({ spawnSprite: () => ({ alive: true, stop() {} }) }));

const { visualMonster, monsterVisualsLayer } = await import('./monsterVisuals');

const scene = {} as Scene;

function monster(): Entity {
  return {
    dying: false,
    monsterAnimation: { action: 0 },
    modelObject: { Ready: true, OutOfView: false, actionFrame: () => 0, gltf: { skeleton: { bones: [] } } },
  } as unknown as Entity;
}

describe('monster body rows', () => {
  // RenderMonsterVisual's CreateSprite runs (GMSwampOfQuiet.cpp:1052-1065): each card on its own bone, at its
  // own offset (cm, handed on in tiles), in the row's light.
  it('hang a cards row on the glow entry, spot by spot', () => {
    const row: MonsterBodyFx = [
      {
        kind: 'cards',
        spots: [
          { bone: 5, card: 'lightMarks', scale: 2 },
          { bone: 34, card: 'lightRed', scale: 0.4, local: [0, -80, 0] },
        ],
        colour: [0.9, 0.8, 0.3],
        pulse: { speed: 0.003, amount: 0.2, base: 0.8 },
      },
    ];
    calls.glows.length = 0;
    visualMonster(scene, monster(), row as never);
    expect(calls.glows).toEqual([
      expect.objectContaining({
        spots: [
          { bone: 5, tex: 'lightMarks', scale: 2, local: undefined },
          { bone: 34, tex: 'lightRed', scale: 0.4, local: [0, -0.8, 0] },
        ],
        colour: [0.9, 0.8, 0.3],
        breathe: true,
        breathSpeed: 0.003,
        breathAmount: 0.2,
        breathBase: 0.8,
      }),
    ]);
  });

  // A JOINT_ENERGY whose head rides a bone (ZzzEffectJoint.cpp:3149-3159): a ribbon `Scale` cm wide with its
  // `MaxTails`, alive until the monster goes, or until it dies when gated so.
  it('run a trail from its bone and end a gated one when the monster dies', () => {
    const e = monster();
    calls.joints.length = 0;
    visualMonster(
      scene,
      e,
      [
        { kind: 'trail', bone: 67, widthCm: 10, maxTails: 15, colour: [0.1, 0.6, 0.3] },
        { kind: 'trail', bone: 9, widthCm: 10, maxTails: 8, colour: [0.8, 0.5, 1], ribbon: 'flare', gate: { alive: true } },
      ] as never
    );
    const [kept, gated] = calls.joints;
    expect(kept.opts).toMatchObject({ maxTails: 15, width: 0.1, colour: [0.1, 0.6, 0.3], texture: 'Effect/JointLaser01.OZJ', seconds: Infinity });
    expect(gated.opts).toMatchObject({ maxTails: 8, texture: 'Effect/Flare.OZJ' });
    const head = { set: vi.fn() };
    (kept.opts.head as (out: unknown) => void)(head);
    expect(head.set).toHaveBeenCalledWith(67, 0, 0);
    (e as unknown as { dying: boolean }).dying = true;
    monsterVisualsLayer.update?.(0, 0.04);
    expect([kept.stopped, gated.stopped]).toEqual([false, true]);
    monsterVisualsLayer.reset?.();
  });

  // `CreateParticle(BITMAP_SMOKELINE1 + rand() % 3, bone, ..., Light, 0, Scale)`: one of the three sheets a
  // spawn, at the bone plus its offset, with the row's light and scale.
  it('make a puff of one of its particles at its bone', () => {
    calls.particles.length = 0;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    visualMonster(
      scene,
      monster(),
      [{ kind: 'puff', every: 1, particles: [['smokeLine1', 'smokeLine2', 'smokeLine3']], bones: [6], local: [2, 30, 0], scale: 1.5, colour: [1, 0.2, 0] }] as never
    );
    monsterVisualsLayer.update?.(0, 0.04);
    random.mockRestore();
    expect(calls.particles).toHaveLength(1);
    const [, kind, at, , scale, colour] = calls.particles[0] as [unknown, string, { x: number; y: number; z: number }, unknown, number, number[]];
    expect([kind, scale, colour]).toEqual(['smokeLine2', 1.5, [1, 0.2, 0]]);
    expect([at.x, at.y, at.z]).toEqual([6.02, 0.3, 0]);
    monsterVisualsLayer.reset?.();
  });

  // The Imperial Guardian bosses' rage smoke (GMEmpireGuardian1.cpp:2093-2108): only under eBuff_Berserker, and
  // each bone of the walk rolls its own `rand() % 6`.
  it('puff under a buff only, a roll for each bone', () => {
    calls.particles.length = 0;
    const row = [{ kind: 'puff', every: 6, particles: ['smoke50'], bones: [0, 5, 10], rollEach: true, colour: [1, 0.1, 0.1], gate: { buff: 81 } }];
    const e = monster();
    const rolls = [0.1, 0.9, 0.1, 0.1, 0.9, 0.9];
    const random = vi.spyOn(Math, 'random').mockImplementation(() => rolls.shift() ?? 0.9);
    visualMonster(scene, e, row as never);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.particles).toHaveLength(0);
    (e as unknown as { buffs: Set<number> }).buffs = new Set([81]);
    monsterVisualsLayer.update?.(0, 0.04);
    random.mockRestore();
    expect(calls.particles.map(p => (p[2] as { x: number }).x)).toEqual([0, 10]);
    monsterVisualsLayer.reset?.();
  });
});
