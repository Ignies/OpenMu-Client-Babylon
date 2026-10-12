import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';
import type { Entity } from '../../ecs/world';
import type { MonsterBodyFx } from '../monsters';

// What the entry hands the glow, joint and particle entries.
const calls = vi.hoisted(() => ({
  glows: [] as unknown[],
  joints: [] as { opts: Record<string, unknown>; stop: () => void; stopped: boolean }[],
  blurs: [] as Record<string, unknown>[],
  particles: [] as unknown[][],
  debris: [] as { at: { x: number }; opts: Record<string, unknown> }[],
  rings: [] as { at: { x: number }; opts: Record<string, unknown> }[],
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
    entityPos: (e: { at?: number }, _h: number, out: { set(x: number, y: number, z: number): unknown }) =>
      e.at === undefined ? out : out.set(e.at, 0, 0),
    entityYaw: (e: { transform?: { rot: { y: number } } }) => e.transform?.rot.y ?? 0,
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
vi.mock('./debris', () => ({
  spawnDebris: (_s: unknown, at: { x: number }, opts: Record<string, unknown>) => void calls.debris.push({ at: { x: at.x }, opts }),
}));
vi.mock('./blur', () => ({
  blurLayer: {
    spawn: (_s: unknown, _at: unknown, opts: Record<string, unknown>) => {
      calls.blurs.push(opts);
      return { alive: true, stop() {} };
    },
  },
}));
vi.mock('./ring', () => ({
  spawnRing: (_s: unknown, at: { x: number }, opts: Record<string, unknown>) => {
    calls.rings.push({ at: { x: at.x }, opts });
    return { alive: true, stop() {} };
  },
}));
vi.mock('./sprite', () => ({ spawnSprite: () => ({ alive: true, stop() {} }) }));

const { visualMonster, monsterVisualsLayer } = await import('./monsterVisuals');
const { cueLook } = await import('../monsters');

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
        { kind: 'trail', bone: 71, widthCm: 100, maxTails: 15, colour: [0.7, 0.7, 1], ribbon: 'spark', gate: { action: [3] } },
      ] as never
    );
    const [kept, gated, blade] = calls.joints;
    // Fred's blade ribbons record all along and are drawn only in Attack1 (ZzzEffectJoint.cpp:6995).
    expect(blade.opts.texture).toBe('Effect/Spark03.OZJ');
    const shown = blade.opts.intensity as (t: number) => number;
    expect(shown(0)).toBe(0);
    (e as unknown as { monsterAnimation: { action: number } }).monsterAnimation.action = 3;
    expect(shown(0)).toBe(1);
    expect(kept.opts.intensity).toBeUndefined();
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

  // The Shadow Look's pair (GMSwampOfQuiet.cpp:939-940): SMOKE 50 at Scale 1.5 and the smoke line at 1.1; the Blaze
  // Napin's fires land `rand() % 20 - 10` cm off their bone (:1017-1022).
  it('give each particle of a puff its own scale and the jitter', () => {
    calls.particles.length = 0;
    visualMonster(scene, monster(), [
      { kind: 'puff', every: 1, particles: ['smoke50', 'smokeLine1'], bones: [11], scales: [1.5, 1.1], jitterCm: 10, colour: [0.5, 1, 0.5] },
    ] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.particles.map(p => [p[1], p[4], p[6]])).toEqual([
      ['smoke50', 1.5, 10],
      ['smokeLine1', 1.1, 10],
    ]);
    monsterVisualsLayer.reset?.();
  });

  // Medusa's hand fires (GMSwampOfQuiet.cpp:544-578): made on the monster's `Angle`, so they fly the way it faces,
  // and `VectorCopy(o->Target->Position, o->StartPosition)`: they ride it. The waterfall rides bone 68 (:1084).
  it('turn a puff with the monster and hand it what it rides', () => {
    calls.particles.length = 0;
    const e = monster();
    (e as unknown as { transform: { rot: { y: number } } }).transform = { rot: { y: 0.5 } };
    visualMonster(scene, e, [
      { kind: 'puff', every: 1, particles: ['fireMono1_4'], bones: [19], turned: true, ride: 'body', colour: [0, 1, 0.5] },
      { kind: 'puff', every: 1, particles: ['waterfall4Orbit0'], bones: [68], ride: 'bone', colour: [0.9, 1, 0.9] },
      { kind: 'puff', every: 1, particles: ['smoke50'], bones: [5], colour: [1, 1, 1] },
    ] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    const [fire, water, plain] = calls.particles;
    expect(fire[3]).toEqual({ x: 0, y: -0.5, z: 0 });
    expect(fire[7]).toBeDefined();
    expect(water[3]).toEqual({ x: 0, y: 0, z: 0 });
    expect(water[7]).toMatchObject({ x: 68, y: 0, z: 0 });
    expect(plain[7]).toBeUndefined();
    monsterVisualsLayer.update?.(0, 0.04);
    // One kept point a ride, rewritten in place.
    expect(calls.particles[4][7]).toBe(water[7]);
    monsterVisualsLayer.reset?.();
  });

  // The Iron Knights' smokes (GM_Raklion.cpp:1875-1897): each bone that wins its roll picks its light, (0.3, 0.6, 1)
  // two times in three and (0.8, 0.8, 0.8) else, for both of its particles.
  it('pick a light for each spot of a puff from its colours', () => {
    calls.particles.length = 0;
    const blue = [0.3, 0.6, 1];
    const grey = [0.8, 0.8, 0.8];
    const rolls = [0, 0.9, 0, 0.1];
    const random = vi.spyOn(Math, 'random').mockImplementation(() => rolls.shift() ?? 0.5);
    visualMonster(scene, monster(), [
      { kind: 'puff', every: 1, particles: ['smoke50', 'smokeLine1_2'], bones: [20, 37], rollEach: true, colour: blue, colours: [blue, blue, grey] },
    ] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    random.mockRestore();
    expect(calls.particles.map(p => [(p[2] as { x: number }).x, p[5]])).toEqual([
      [20, grey],
      [20, grey],
      [37, blue],
      [37, blue],
    ]);
    monsterVisualsLayer.reset?.();
  });

  // CreateBlur's Type 1 (motion_blur), its Type 4 drawn darkening (EnableAlphaBlendMinus) and its Short flag.
  it("hand a blur its sheet, its dark pass and its Short flag", () => {
    calls.blurs.length = 0;
    visualMonster(scene, monster(), [
      { kind: 'blur', from: 44, to: 44, colour: [0.3, 1, 3.5], sheet: 'motionBlur', short: true },
      { kind: 'blur', from: 33, to: 33, colour: [1, 1, 1], sheet: 'blur01', dark: true },
    ] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.blurs.map(b => [b.texture, b.short, b.blend])).toEqual([
      ['Effect/motion_blur.OZJ', true, 'add'],
      ['Effect/blur01.OZJ', undefined, 'subtract'],
    ]);
    monsterVisualsLayer.reset?.();
  });

  // The Iron Knights' death (GM_Raklion.cpp:1960-1970): at each of four bones, six MODEL_EFFECT_BROKEN_ICE0 + rand() % 3
  // in its light, SubType 0.
  it('throw a shards row of its pieces at each bone', () => {
    calls.debris.length = 0;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    visualMonster(scene, monster(), [{ kind: 'shards', every: 1, shards: 'brokenIce', count: 2, bones: [20, 37], colour: [0.3, 0.5, 1] }] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    random.mockRestore();
    expect(calls.debris.map(d => [d.at.x, d.opts.model, d.opts.ice, d.opts.colour])).toEqual([
      [20, 'Effect/ice_stone01.glb', true, [0.3, 0.5, 1]],
      [20, 'Effect/ice_stone01.glb', true, [0.3, 0.5, 1]],
      [37, 'Effect/ice_stone01.glb', true, [0.3, 0.5, 1]],
      [37, 'Effect/ice_stone01.glb', true, [0.3, 0.5, 1]],
    ]);
    monsterVisualsLayer.reset?.();
  });

  // The BITMAP_HOLE card in Medusa's hands is a MoveMonsterVisual CreateSprite: drawn only in Attack1 / Attack2
  // past their frame 2 (GMSwampOfQuiet.cpp:544-576).
  it('show a cards row gated on an action only in it', () => {
    calls.glows.length = 0;
    const e = monster();
    visualMonster(scene, e, [
      { kind: 'cards', spots: [{ bone: 19, card: 'hole', scale: 0.2 }], colour: [1, 1, 1], gate: { action: [3, 4], frames: [[3, Infinity]] } },
      { kind: 'cards', spots: [{ bone: 5, card: 'light', scale: 1 }], colour: [1, 1, 1] },
    ] as never);
    const [hole, light] = calls.glows as { when?: () => boolean }[];
    expect(light.when).toBeUndefined();
    expect(hole.when?.()).toBe(false);
    (e as unknown as { monsterAnimation: { action: number } }).monsterAnimation.action = 3;
    expect(hole.when?.()).toBe(true);
  });

  // Valam's cards are RenderCryWolf1stMonsterVisual's, drawn only in Crywolf and Devil Square (GMCrywolf1st.cpp:1566-1570).
  it("show a cards row only while its gate's own test holds", () => {
    calls.glows.length = 0;
    let there = false;
    visualMonster(scene, monster(), [
      { kind: 'cards', spots: [{ bone: 28, card: 'light', scale: 1 }], colour: [0, 0.5, 0.1], gate: { when: () => there } },
    ] as never);
    const [card] = calls.glows as { when?: () => boolean }[];
    expect(card.when?.()).toBe(false);
    there = true;
    expect(card.when?.()).toBe(true);
  });

  // Kundun's Shock roar (GMHellas.cpp:1596-1631): `PKKey` is 10 to frame 4, then one more a tick (one less past
  // frame 10, down to 10); `Skill` climbs 3 a tick into frames 4-5 and 8-9 and falls 3 out of them. `fRoar` is
  // `(PKKey + Skill) * 0.15` in Shock, 1 out of it, and scales the roar rows' cards and particles.
  it('scale the roar rows by the Shock roar', () => {
    calls.glows.length = 0;
    calls.particles.length = 0;
    const e = monster();
    let frame = 0;
    const anim = (e as unknown as { monsterAnimation: { action: number } }).monsterAnimation;
    (e as unknown as { modelObject: { actionFrame: () => number } }).modelObject.actionFrame = () => frame;
    visualMonster(scene, e, [
      { kind: 'cards', spots: [{ bone: 100, card: 'flareRed', scale: 1.2 }], colour: [1, 1, 1], roar: true },
      { kind: 'puff', every: 1, particles: ['smoke13'], bones: [100], colour: [1, 1, 1], roar: true },
    ] as never);
    const red = calls.glows[0] as { scaleBy: () => number };
    const step = () => monsterVisualsLayer.update?.(0, 0.04);
    step();
    expect([red.scaleBy(), calls.particles[0][4]]).toEqual([1, 1]);
    anim.action = 5;
    step();
    expect(red.scaleBy()).toBeCloseTo(1.5);
    frame = 4.5;
    step();
    step();
    // PKKey 12, Skill 6.
    expect(red.scaleBy()).toBeCloseTo(18 * 0.15);
    frame = 5.5;
    step();
    // PKKey 13, Skill 3.
    expect(red.scaleBy()).toBeCloseTo(16 * 0.15);
    expect(calls.particles[calls.particles.length - 1][4]).toBeCloseTo(16 * 0.15);
    frame = 7;
    step();
    expect(red.scaleBy()).toBeCloseTo(14 * 0.15);
    frame = 11;
    step();
    expect(red.scaleBy()).toBeCloseTo(13 * 0.15);
    anim.action = 0;
    step();
    expect(red.scaleBy()).toBe(1);
    monsterVisualsLayer.reset?.();
  });

  // The anvil's sparks (ZzzCharacter.cpp, the smith): `spawnJoint` copies the heading it is handed, so one kept
  // vector serves every spark; a new one a spark was garbage every tick.
  it('hand every spark one kept heading, aimed at its own roll', () => {
    calls.joints.length = 0;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    visualMonster(scene, monster(), [
      { kind: 'sparks', every: 1, tries: 2, bone: 3, pitch: [90, 90], yaw: [0, 0], chip: 0 },
    ] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    random.mockRestore();
    const [a, b] = calls.joints.map(j => j.opts.heading as { x: number; y: number; z: number });
    expect(a).toBe(b);
    expect(a.y).toBeCloseTo(1);
    monsterVisualsLayer.reset?.();
  });

  // The RenderObject swing loops (GM_Kanturu_3rd.cpp:961-988, GM_Raklion.cpp:1977-1998): CreateBlur from one bone
  // point to another while the gate is open, one trail a swing that stops sampling when it closes.
  it('run a blur between two bone points through its gate', () => {
    calls.blurs.length = 0;
    const e = monster();
    const anim = (e as unknown as { monsterAnimation: { action: number } }).monsterAnimation;
    visualMonster(scene, e, [
      { kind: 'blur', from: 32, fromLocal: [10, 0, 0], to: 38, toLocal: [10, -10, 0], colour: [1, 1, 1], sheet: 'blur02', gate: { action: [3] } },
      { kind: 'blur', from: 69, to: 73, colour: [1, 1.2, 2], sheet: 'blur01' },
    ] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    // The ungated one runs from the first tick, for good.
    expect(calls.blurs).toHaveLength(1);
    expect(calls.blurs[0]).toMatchObject({ texture: 'Effect/blur01.OZJ', colour: [1, 1.2, 2], tickHistory: true, seconds: Infinity });
    anim.action = 3;
    monsterVisualsLayer.update?.(0, 0.04);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.blurs).toHaveLength(2);
    const swing = calls.blurs[1] as { follow: (o: unknown) => void; base: (o: unknown) => void; until: () => boolean; texture: string };
    expect(swing.texture).toBe('Effect/blur02.OZJ');
    const tip = { set: vi.fn() };
    const hilt = { set: vi.fn() };
    swing.follow(tip);
    swing.base(hilt);
    expect(tip.set).toHaveBeenCalledWith(38.1, -0.1, 0);
    expect(hilt.set).toHaveBeenCalledWith(32.1, 0, 0);
    expect(swing.until()).toBe(false);
    anim.action = 0;
    expect(swing.until()).toBe(true);
    monsterVisualsLayer.reset?.();
  });

  // The Dark Ghost's death smoke is made at `o->Position`, not a bone (GMEmpireGuardian2.cpp:946-950).
  it('make an origin puff at the body', () => {
    calls.particles.length = 0;
    const e = monster();
    (e as unknown as { at: number }).at = 7;
    visualMonster(scene, e, [{ kind: 'puff', every: 1, particles: ['smoke39', 'smoke39'], bones: [], origin: true, colour: [0.1, 1, 0.2] }] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.particles.map(p => p[1])).toEqual(['smoke39', 'smoke39']);
    expect((calls.particles[0][2] as { x: number }).x).toBe(7);
    monsterVisualsLayer.reset?.();
  });

  // The Maya hands' death drops (GM_Kanturu_3rd.cpp:889-893): five a tick at `BoneTransform[rand() % 45]`, while the
  // Maya battle is before MAYA3 - a state of the event the content reads (`gate.when`).
  it("pick random bones for a puff and hold it to its gate's own test", () => {
    calls.particles.length = 0;
    let early = false;
    visualMonster(scene, monster(), [
      { kind: 'puff', every: 1, particles: ['waterfall3_6'], bones: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], pick: 3, colour: [0.4, 0.6, 1], gate: { when: () => early } },
    ] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.particles).toHaveLength(0);
    early = true;
    // The tick's roll, then a bone for each pick.
    const rolls = [0.5, 0.05, 0.95, 0.5];
    const random = vi.spyOn(Math, 'random').mockImplementation(() => rolls.shift() ?? 0.5);
    monsterVisualsLayer.update?.(0, 0.04);
    random.mockRestore();
    expect(calls.particles.map(p => (p[2] as { x: number }).x)).toEqual([0, 9, 5]);
    monsterVisualsLayer.reset?.();
  });

  // The Napins' strikes (GMSwampOfQuiet.cpp:427-460, :501-531): a crater, twenty MODEL_STONE2 and shock waves made
  // `(0, -250, 0)` turned by its Angle off its position, not at a bone.
  it('lay a ground row and throw a shards row ahead of the monster', () => {
    calls.rings.length = 0;
    calls.debris.length = 0;
    const e = { ...monster(), at: 7, transform: { rot: { y: Math.PI / 2 } } } as unknown as Entity;
    visualMonster(scene, e, [
      { kind: 'ground', every: 1, ground: 'shockWave11', count: 2, bones: [], aheadCm: 250, colour: [0.3, 0.2, 1] },
      { kind: 'shards', every: 1, shards: 'stone2', count: 20, bones: [], aheadCm: 250, colour: [1, 1, 1] },
    ] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.rings.map(r => [r.at.x, r.opts.seconds])).toEqual([
      [9.5, 20 / 25],
      [9.5, 20 / 25],
    ]);
    expect(calls.debris).toHaveLength(20);
    expect(calls.debris.every(d => d.at.x === 9.5 && d.opts.ice !== true)).toBe(true);
    monsterVisualsLayer.reset?.();
  });

  // A MoveMonsterVisual line no row draws (Nightmare's storm and laser): the content's own staging, through its gate.
  it('hand a call row the scene and the monster while its gate is open', () => {
    const runs: unknown[][] = [];
    const anim = { action: 0 };
    const e = { ...monster(), monsterAnimation: anim } as unknown as Entity;
    visualMonster(scene, e, [{ kind: 'call', every: 1, run: (s: unknown, m: unknown) => runs.push([s, m]), gate: { action: [2] } }] as never);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(runs).toHaveLength(0);
    anim.action = 2;
    monsterVisualsLayer.update?.(0, 0.04);
    expect(runs).toEqual([[scene, e]]);
    monsterVisualsLayer.reset?.();
  });

  // Dark_Elf_Check (GMCrywolf1st.cpp:120-123, :844-866): Crywolf reaching START cues one burst, which the first Dark
  // Elf to move takes: BITMAP_CRATER SubType 2, five BITMAP_SHOCK_WAVE SubType 8 and two blue blurs at bone 27, once.
  it('fire the cued rows once, on the body that takes the cue', () => {
    calls.particles.length = 0;
    calls.rings.length = 0;
    const cue = { cue: 'crywolfStart' };
    const row = [
      { kind: 'ground', every: 1, ground: 'crater2', count: 1, bones: [27], colour: [1, 1, 1], gate: cue },
      { kind: 'ground', every: 1, ground: 'shockWave8', count: 5, bones: [27], colour: [1, 0.2, 0.2], gate: cue },
      { kind: 'puff', every: 1, particles: ['blueBlur1', 'blueBlur1'], bones: [27], colour: [1, 0.2, 0.2], gate: cue },
    ];
    visualMonster(scene, monster(), row as never);
    visualMonster(scene, monster(), row as never);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.rings).toHaveLength(0);
    cueLook('crywolfStart');
    monsterVisualsLayer.update?.(0, 0.04);
    monsterVisualsLayer.update?.(0, 0.04);
    expect(calls.rings.map(r => [r.at.x, r.opts.texture])).toEqual([
      [27, 'Effect/cratered.OZT'],
      ...Array.from({ length: 5 }, () => [27, 'Effect/Shockwave.OZJ']),
    ]);
    expect(calls.rings[0].opts).toMatchObject({ seconds: 40 / 25, scale: 3, blend: 'alpha' });
    expect(calls.rings[1].opts).toMatchObject({ seconds: 10 / 25, colour: [1, 0.2, 0.2] });
    expect(calls.particles.map(p => p[1])).toEqual(['blueBlur1', 'blueBlur1']);
    monsterVisualsLayer.reset?.();
  });
});
