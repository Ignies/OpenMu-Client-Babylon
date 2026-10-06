import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { fxNow } from '@/controllers/fx/core';
import { lighting } from '@/controllers/lighting';
import { SKILL_LIGHTS } from '@/controllers/lighting/skills';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import type { TailStrip, TickedFx } from '@/controllers/fx/ticked';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { PlayerAction } from '../../objects/enum';
import { clearBuffVisuals, playAreaSkillVisual, playTargetedSkillVisual, setBuffVisual } from '../skillVisuals';
import { heroCastSound, skillSound } from '@/controllers/sound/combat';
import { DEG, JOINT_SPARKS } from '../_shared';
import { beginDarkSide, darkSideCast, darkSideHitTicks, isDarkSide, observeDarkSideEcho, observeDarkSideTargets, rageLayer } from './dark_side/rage';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The live world: only Dark Side's follow-ups read it (the hero's clip).
const store = vi.hoisted(() => ({ world: null as unknown }));
vi.mock('@/ecs/current', () => ({
  Ecs: {
    get world() {
      return store.world;
    },
  },
}));

const played: string[] = [];
vi.mock('@/controllers/sound/listener', async importOriginal => ({
  ...(await importOriginal<object>()),
  playSfx: (key: string) => {
    played.push(key);
    return 0;
  },
}));

/**
 * The Rage Fighter skills against the 25 Hz tick: the packet is tick 0, an effect it creates first moves on tick 1
 * (AttackStage sees AttackTime t on tick t, ZzzCharacter.cpp:4132-4136), and the caster's clip is at key
 * `tick * keysPerTick` on tick `tick` (base attack speed: 0.4 keys a tick, DRAGONLORE 0.3).
 */
let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

interface Spawn {
  tick: number;
  name: string;
  at: Vector3;
  opts: Record<string, unknown>;
  /** The tick on which it ended, if it did. */
  end?: number;
  handle?: { alive: boolean };
}
/** One call a `ticked` script made on its tick: `sprite`, `decal` or a strip's `push` (with the strip's options and light). */
interface Draw {
  tick: number;
  kind: 'sprite' | 'decal' | 'push';
  args: unknown[];
}
interface Run {
  spawns: Spawn[];
  draws: Draw[];
  sounds: { tick: number; key: string }[];
}

function run(
  skill: number,
  clip: PlayerAction,
  {
    keysPerTick = 0.4,
    ticks = 60,
    area = false,
    hero = false,
    leaveAt = 0,
    target = true,
    buffs,
    onTick,
  }: {
    keysPerTick?: number;
    ticks?: number;
    area?: boolean;
    hero?: boolean;
    leaveAt?: number;
    target?: boolean;
    /** The caster's buffs. */
    buffs?: Set<number>;
    /** Called before each tick with the caster and the target. */
    onTick?: (tick: number, caster: Entity, target: Entity | null) => void;
  } = {}
): Run {
  let tick = 0;
  const model = { CurrentAction: clip as number, actionFrame: () => 0, AnimationSpeed: keysPerTick };
  model.actionFrame = () => (model.CurrentAction === clip ? tick * keysPerTick : 0);
  const caster = {
    netId: 1,
    localPlayer: hero || undefined,
    buffs,
    transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0.5, 0), scale: 1 },
    playerAnimation: { action: clip },
    modelObject: model,
  } as unknown as Entity;
  const aim = target ? ({ netId: 2, transform: { pos: new Vector3(103, 0, 104), rot: new Vector3(), scale: 1 } } as unknown as Entity) : null;

  effects.reset();
  const out: Run = { spawns: [], draws: [], sounds: [] };
  const real = effects.spawn.bind(effects);
  // A ticked script draws through `fx`: record each call with the tick it was made on.
  const strips = new WeakMap<object, TailStrip>();
  const recorded = (fx: TickedFx): TickedFx => ({
    scene: fx.scene,
    sprite: (...a: Parameters<TickedFx['sprite']>) => {
      out.draws.push({ tick, kind: 'sprite', args: a });
      fx.sprite(...a);
    },
    decal: (...a: Parameters<TickedFx['decal']>) => {
      out.draws.push({ tick, kind: 'decal', args: a });
      fx.decal(...a);
    },
    ribbon: o => fx.ribbon(o),
    strip: o => {
      const s = fx.strip(o);
      const proxy = new Proxy(s, {
        get: (t, k) => (k === 'push' ? (...a: Parameters<TailStrip['push']>) => (out.draws.push({ tick, kind: 'push', args: [o, t.light, ...a] }), t.push(...a)) : t[k as keyof TailStrip]),
      });
      strips.set(proxy, s);
      return proxy;
    },
    drop: s => fx.drop(strips.get(s) ?? s),
  });
  const spy = vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: Scene, at: Vector3, opts: never) => {
    const spawn: Spawn = { tick, name, at: at.clone(), opts: (opts ?? {}) as Record<string, unknown> };
    out.spawns.push(spawn);
    if (name === 'ticked') {
      const script = opts as unknown as { tick: (fx: TickedFx, n: number) => boolean };
      return (spawn.handle = real(name, s, at, { tick: (fx: TickedFx, n: number) => script.tick(recorded(fx), n) } as never));
    }
    return (spawn.handle = real(name, s, at, opts));
  }) as never);
  played.length = 0;
  const take = () => {
    for (const key of played) out.sounds.push({ tick, key });
    played.length = 0;
  };
  if (area) playAreaSkillVisual(scene, skill, caster, { x: 100, y: 100 }, () => 0, aim);
  else playTargetedSkillVisual(scene, skill, caster, aim);
  take();
  for (tick = 1; tick <= ticks; tick++) {
    if (leaveAt && tick >= leaveAt) model.CurrentAction = PlayerAction.PLAYER_STOP_MALE;
    onTick?.(tick, caster, aim);
    effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
    take();
    for (const s of out.spawns) if (s.end === undefined && s.handle && !s.handle.alive) s.end = tick;
  }
  spy.mockRestore();
  return out;
}

/** The ticks on which a sprite of `texture` was spawned. */
const spriteTicks = (r: Run, texture: string): number[] => [...new Set(r.spawns.filter(s => s.name === 'sprite' && s.opts.texture === texture).map(s => s.tick))];
/** The ticks on which `key` played. */
const soundTicks = (r: Run, key: string): number[] => r.sounds.filter(s => s.key === key).map(s => s.tick);
/** The ticks a ticked script drew a one-tick sprite of `texture` on, and how many it drew on each. */
const drawTicks = (r: Run, texture: string): [number, number][] => {
  const n = new Map<number, number>();
  for (const d of r.draws) if (d.kind === 'sprite' && d.args[0] === texture) n.set(d.tick, (n.get(d.tick) ?? 0) + 1);
  return [...n.entries()];
};
const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('Dragon Slasher (265): MODEL_DRAGON_KICK_DUMMY reads the caster\'s DRAGONKICK clip (MoveHandlers.cpp:9826-9915)', () => {
  const KICK = PlayerAction.PLAYER_SKILL_DRAGONKICK;
  const ATT = 'Sound/Ragefighter/Rage_Dragonkick_Att';

  it('bursts on the target every tick past key 5, and Rage_Dragonkick_Att every tick past key 8', () => {
    // Key 5.2 on tick 13, 8.4 on tick 21; the clip is left on tick 26.
    const r = run(265, KICK, { leaveAt: 26, ticks: 40 });
    // Twice a tick four BITMAP_ENERGY sub7, each drawn on its moves 1-4: made on ticks 13-25.
    expect(drawTicks(r, TEX.thunder)).toEqual(range(13, 28).map(t => [t, 8 * (Math.min(t, 25) - Math.max(13, t - 3) + 1)]));
    expect(soundTicks(r, ATT)).toEqual(range(21, 25));
  });

  it('drops everything when the caster leaves the clip first', () => {
    const r = run(265, KICK, { leaveAt: 10, ticks: 40 });
    expect(drawTicks(r, TEX.thunder)).toEqual([]);
    expect(soundTicks(r, ATT)).toEqual([]);
  });

  it('draws nothing on the target without one (m_sTargetIndex < 0), and casts in silence (MonkSystem.cpp:1226-1227, :1259)', () => {
    const r = run(265, KICK, { leaveAt: 26, ticks: 40, target: false });
    expect(drawTicks(r, TEX.thunder)).toEqual([]);
    expect(soundTicks(r, ATT)).toEqual([]);
    expect(soundTicks(r, 'Sound/Ragefighter/Rage_Dragonkick')).toEqual([]);
    // With one, another caster's Rage_Dragonkick goes with the volley at his packet; it is no skill sound everyone plays.
    expect(soundTicks(run(265, KICK, { leaveAt: 26, ticks: 40 }), 'Sound/Ragefighter/Rage_Dragonkick')).toEqual([0]);
    expect(skillSound(265)).toBeNull();
  });

  it('the hero\'s Rage_Dragonkick goes at his click, with a target only, and not again with the echo (SkillCast.cpp:866-879, MonkSystem.cpp:1226-1227, :1259, WSclient.cpp:5115-5121)', () => {
    expect([heroCastSound(265, true), heroCastSound(265, false)]).toEqual(['Sound/Ragefighter/Rage_Dragonkick', null]);
    const r = run(265, KICK, { leaveAt: 26, ticks: 40, hero: true });
    expect(soundTicks(r, 'Sound/Ragefighter/Rage_Dragonkick')).toEqual([]);
    // The rest of the effect still comes with it.
    expect(soundTicks(r, ATT)).toEqual(range(21, 25));
  });

  it('a burst, twice over: four BITMAP_ENERGY sub7, LIGHTNING_MEGA1 sub0 and SPARK+1 sub3 and sub8, and two SPARK sub13 (MoveHandlers.cpp:9866-9895)', () => {
    // rand() % n is n / 2: fScale (0.5 + 0.2) x 1.5 x 1.8 = 1.89. One burst: the clip is left on tick 14.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const r = run(265, KICK, { leaveAt: 14, ticks: 60 });
    random.mockRestore();
    const drawn = (texture: string, tick: number) => r.draws.filter(d => d.kind === 'sprite' && d.tick === tick && d.args[0] === texture);
    const [energy] = drawn(TEX.thunder, 13);
    const [mega] = drawn(TEX.lightningMega1, 13);
    // ENERGY: Thunder01 64 px x 1.89 x (4 + 6) x 0.1, turned 180 + 20 a move, Light x0.97 a move (ZzzEffectParticle.cpp:723-753, :4939-4985).
    expect([energy.args[1], energy.args[5], energy.args[7], energy.args[8]]).toEqual([[0.7, 0.7, 1], expect.closeTo(0.64 * 1.89), expect.closeTo((200 * Math.PI) / 180), expect.closeTo(0.97)]);
    // MEGA1: 128 px x 1.89 x 0.9, turned 180, Alpha 1 - 0.15 a move over its Light (:1826-1843, :6071-6091).
    expect([mega.args[5], mega.args[7], mega.args[8]]).toEqual([expect.closeTo(1.28 * 1.89 * 0.9), expect.closeTo(Math.PI), expect.closeTo(0.85)]);
    expect([13, 14, 15, 16, 17].map(t => [drawn(TEX.thunder, t).length, drawn(TEX.lightningMega1, t).length])).toEqual([[8, 8], [8, 8], [8, 8], [8, 8], [0, 0]]);
    // Spark03: 8 sub3 (Scale 1 x0.8 a move, 4 moves), 8 sub8 (Scale 1 - 0.5 a move, gone under 0.2), both +-1 % with WorldTime,
    // and 4 sub13 (Scale 0.6 x 1.6).
    const sparks = drawn(TEX.spark3, 13).map(d => d.args[5] as number);
    const near = (v: number, tolerance: number) => sparks.filter(s => Math.abs(s - v) <= tolerance);
    expect(near(0.32 * 0.8, 0.003)).toHaveLength(8);
    expect(near(0.32 * 0.5, 0.004)).toHaveLength(8);
    expect(near(0.32 * 0.96, 1e-9)).toHaveLength(4);
    expect(drawn(TEX.spark3, 14)).toHaveLength(8 + 4);
    // The sub13 sparks fly 4.5 cm a tick, rise and fall by a Gravity of 14 losing 2 a move, bounce and die by LifeTime 32 (:2016-2061, :6558-6608).
    const last = Math.max(...r.draws.filter(d => d.kind === 'sprite' && d.args[0] === TEX.spark3).map(d => d.tick));
    expect(last).toBeGreaterThan(20);
    expect(last).toBeLessThan(13 + 32);
  });

  const winds = (r: Run) => r.draws.filter(d => d.kind === 'push' && (d.args[0] as { texture: string }).texture === TEX.groundWind);

  it('BITMAP_GROUND_WIND: between DRAGONKICK keys 4 and 5, Velocity x 10 joints a tick from bone 1, each then riding the dummy\'s bone 2 (MoveHandlers.cpp:9839-9860, ZzzEffectJoint.cpp:2731-2740, :6900-6915)', () => {
    const r = run(265, KICK, { leaveAt: 26, ticks: 40 });
    const all = winds(r);
    const born = all.filter(d => d.args[1] === 1);
    // Keys 4.4 and 4.8 (ticks 11 and 12); the dummy plays at twice the clip's 0.4, so 8 joints each.
    expect([11, 12].map(t => born.filter(d => d.tick === t).length)).toEqual([8, 8]);
    expect(born).toHaveLength(16);
    // Each lays a tail on its tick and the 9 after (LifeTime 10), Light x0.7 a move.
    expect(all).toHaveLength(16 * 11);
    expect(Math.max(...all.map(d => d.tick))).toBe(21);
    const [opts, , , , , half, yaw] = born[0].args as [{ colour: number[]; maxTails: number; faces: string; maxSegment: number }, number, number, number, number, number, number];
    expect([opts.colour, opts.maxTails, opts.faces, opts.maxSegment, half, yaw]).toEqual([[0.7, 0.7, 1], 8, 'flat', 0.6, 0.75, 0.5]);
    // Made on the caster's bone 1 (no skeleton here: the feet + 90 cm).
    expect(born[0].args.slice(2, 5)).toEqual([100, 0.9, 100]);
    // Its first move (tick 11): the dummy at frame 8.8 blends its prior key 7 into key 8 by 0.8 (ZzzBMD.cpp:146-281), so bone
    // 2 stands 130.65 cm out at the caster's yaw and the turn between, 134.64 cm up and 20 more.
    const [qz, qw] = [0.2 * -0.57686 + 0.8 * 0.06498, 0.2 * 0.81684 + 0.8 * 0.99789];
    const turn = 0.5 + 2 * Math.atan2(qz, qw);
    const [x, y, z, , , ] = all[1].args.slice(2) as number[];
    expect([x, y, z].map(v => Math.round(v * 1000) / 1000)).toEqual([100 - 1.3065 * Math.cos(turn), 1.3464 + 0.2, 100 - 1.3065 * Math.sin(turn)].map(v => Math.round(v * 1000) / 1000));
    expect(all[1].args[1]).toBeCloseTo(0.7);
  });

  it('the joints go with the dummy when the caster leaves the clip', () => {
    expect(Math.max(...winds(run(265, KICK, { leaveAt: 15, ticks: 40 })).map(d => d.tick))).toBe(14);
  });
});

describe('Chain Drive (262): BITMAP_SWORDEFF reads the caster\'s GIANTSWING key (MoveHandlers.cpp:9312-9380)', () => {
  const SWING = PlayerAction.PLAYER_SKILL_GIANTSWING;
  const ATT = 'Sound/Ragefighter/Rage_Giantswing_Att';

  it('two blows with Rage_Giantswing_Att: past key 6 (tick 16) and past key 11 (tick 28)', () => {
    for (const skill of [262, 558]) {
      const r = run(skill, SWING);
      expect(soundTicks(r, ATT)).toEqual([16, 28]);
      // The giant-swing wave goes out with the first blow, drawn twice.
      expect(r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwave).map(s => s.tick)).toEqual([16, 16]);
    }
  });

  it('the first blow\'s MODEL_SHOCKWAVE01 sub0 leaves bone 0 + (-180, 100, 0) and backs off at 220 + Scale x 80 cm (MoveHandlers.cpp:9330-9338, :9428-9436)', () => {
    // The run ends on tick 19, the wave's third move.
    const r = run(262, SWING, { ticks: 19 });
    const waves = r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwave);
    const { seconds, scaleAt, intensity, colour, angle, follow } = waves[0].opts as { seconds: number; scaleAt: (t: number) => number; intensity: (t: number) => number; colour: number[]; angle: number[]; follow: (out: Vector3) => Vector3 };
    // LifeTime 5 / (2 x 0.4) = 6.25: drawn 7 ticks; Scale + 0.2 and Light x0.65 a move.
    expect([Math.round(seconds * 25), scaleAt(3 / 25), intensity(3 / 25), colour]).toEqual([7, expect.closeTo(1.6), expect.closeTo(0.65 ** 3), [0.4, 0.5, 1]]);
    expect(angle).toEqual([60, 0, expect.closeTo(0.5 * (180 / Math.PI) - 180)]);
    // No skeleton here: it starts at the feet + 90 cm, right over the caster, so it has no way to back off along.
    expect([waves[0].at.x, waves[0].at.y, waves[0].at.z]).toEqual([100, 0.9, 100]);
    // Each move sets its height above sea level outright: 220 + (1 + 0.2 x 3) x 80 cm.
    const at = follow(new Vector3());
    expect([at.x, at.y, at.z]).toEqual([100, expect.closeTo((220 + 1.6 * 80) / 100), 100]);
  });

  it('drops a blow whose key the clip never reaches', () => {
    const r = run(262, SWING, { leaveAt: 20 });
    expect(soundTicks(r, ATT)).toEqual([16]);
    expect(drawTicks(r, TEX.ring)).toEqual([]);
  });

  it('the first blow\'s BITMAP_DAMAGE1 throws a particle on its moves 5, 9, 13 and 17, each drawn 4 ticks growing x1.2 (MoveHandlers.cpp:9456-9475)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const r = run(262, SWING);
    random.mockRestore();
    const sparks = r.draws.filter(d => d.kind === 'sprite' && d.args[0] === TEX.damage1);
    expect(drawTicks(r, TEX.damage1)).toEqual(range(21, 36).map(t => [t, 1]));
    // Scale (1.5 + 0.02) x 1.4 with rand() % n at n / 2, 64 px, x1.2 a move; Light (0.6, 0.94, 1) x 1.6 a move, clamped.
    expect(sparks.slice(0, 4).map(d => Math.round((d.args[5] as number) * 1e4) / 1e4)).toEqual([1, 2, 3, 4].map(m => Math.round(0.64 * 1.52 * 1.4 * 1.2 ** m * 1e4) / 1e4));
    expect(sparks[0].args[1]).toEqual([0.96, 1, 1]);
    expect(sparks[1].args[1]).toEqual([1, 1, 1]);
    // -40 + 45 cm across, 50 + 50 cm over the target's feet.
    expect(sparks[0].args.slice(2, 5).map(v => Math.round((v as number) * 100) / 100)).toEqual([103.05, 1, 104.05]);
    // None without a target.
    expect(drawTicks(run(262, SWING, { target: false }), TEX.damage1)).toEqual([]);
  });

  it('the second blow\'s BITMAP_SHINY+4 throws a ring particle a move for 16 moves, each drawn 7 ticks (ZzzEffect.cpp:8497-8504)', () => {
    const r = run(262, SWING);
    // Rings born on ticks 29-44, each on its moves 1-7.
    expect(drawTicks(r, TEX.ring)).toEqual(range(29, 50).map(t => [t, Math.min(t, 44) - Math.max(29, t - 6) + 1]));
    const first = r.draws.filter(d => d.kind === 'sprite' && d.args[0] === TEX.ring).slice(0, 2);
    // 64 px x 1.9 x 1.1 a move, Light x0.9 a move.
    expect(first.map(d => [d.args[5], d.args[8]])).toEqual([[expect.closeTo(0.64 * 1.9 * 1.1), expect.closeTo(0.9)], [expect.closeTo(0.64 * 1.9 * 1.1 ** 2), expect.closeTo(0.81)]]);
  });

  it('BITMAP_SWORDEFF makes a joint on bone 5 each tick it lives, flat, 100 cm wide, each drawn 10 moves (MoveHandlers.cpp:9322-9324, ZzzEffectJoint.cpp:2720-2729)', () => {
    const pushes = (r: Run) => r.draws.filter(d => d.kind === 'push' && (d.args[0] as { texture: string }).texture === TEX.swordEffJoint);
    const all = pushes(run(262, SWING));
    // Its LifeTime: 200, 45 at the first blow, 20 at the second (tick 28), so joints on ticks 1-47, each laying 10 tails.
    expect(all).toHaveLength(47 * 10);
    expect([1, 10, 47, 56, 57].map(t => all.filter(d => d.tick === t).length)).toEqual([1, 10, 10, 1, 0]);
    const [opts, light, x, y, z, half, yaw, pitch] = all[0].args as [{ colour: number[]; maxTails: number; faces: string }, number, number, number, number, number, number, number];
    expect([opts.colour, opts.maxTails, opts.faces, light, half, yaw, pitch]).toEqual([[0.6, 0.6, 1], 50, 'flat', 1, 0.5, 0.5, 0]);
    // Bone 5; no skeleton here, so the feet + 90 cm.
    expect([x, y, z]).toEqual([100, 0.9, 100]);
    // It ends with the clip: joints on ticks 1-19 when the caster leaves it on tick 20.
    expect(pushes(run(262, SWING, { leaveAt: 20 }))).toHaveLength(19 * 10);
  });

  /** [tick, drawn ticks, Scale at the spawn and 3 moves on] of each `model` spawn. */
  const models = (r: Run, model: string) =>
    r.spawns
      .filter(s => s.name === 'model' && s.opts.model === model)
      .map(s => [s.tick, Math.round((s.opts.seconds as number) * 25), ...[0, 3].map(n => Math.round((s.opts.scaleAt as (t: number) => number)(n / 25) * 1000) / 1000)]);

  it('the second blow sends MODEL_SHOCKWAVE02, drawn twice, and two MODEL_SHOCKWAVE_SPIN01 (MoveHandlers.cpp:9350-9367)', () => {
    for (const skill of [262, 558]) {
      const r = run(skill, SWING);
      // LifeTime 14 / (2 x 0.4) = 17.5, drawn 18 ticks, Scale 0.5 + 0.1 a tick; 8 / 0.4 = 20, Scale x 1.01 a tick.
      expect(models(r, 'Effect/shockwave02.glb')).toEqual([[28, 18, 0.5, 0.8], [28, 18, 0.5, 0.8]]);
      expect(models(r, MODEL.shockwaveSpin)).toEqual([[28, 20, 0.5, 0.515], [28, 20, 0.9, 0.927]]);
      // The spin waves draw Damage1 over their own sheet (ZzzObject.cpp:2499-2503).
      expect(r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwaveSpin).map(s => s.opts.texture)).toEqual([TEX.damage1, TEX.damage1]);
    }
    expect(models(run(262, SWING, { leaveAt: 20 }), MODEL.shockwaveSpin)).toEqual([]);
  });

  it('MODEL_WOLF_HEAD_EFFECT2 with each blow: sub3 throws a sub4 and a sub6 a move while its LifeTime is 3 or more, sub5 throws none (MoveHandlers.cpp:9736-9800)', () => {
    const between = (v: unknown, lo: number, hi: number): boolean => typeof v === 'number' && v >= lo - 1e-9 && v <= hi + 1e-9;
    for (const skill of [262, 558]) {
      const heads = run(skill, SWING).spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.wolfHead2);
      const at = (t: number) => heads.filter(s => s.tick === t);
      // LifeTime 4 / 0.4 = 10: sub3 on the first blow (tick 16) throws on its moves 1-8; sub5 on the second (tick 28).
      expect([16, ...range(17, 27), 28].map(t => at(t).length)).toEqual([1, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 1]);
      expect(heads).toHaveLength(1 + 16 + 1);
      expect([at(16)[0].opts.scale, at(16)[0].end]).toEqual([1, 26]);
      expect([at(28)[0].opts.scale, at(28)[0].end]).toEqual([1.5, 38]);
      for (const t of range(17, 24)) {
        // sub4: Scale 0.7-0.9 for 5-6 ticks; sub6: 1.2-1.6 for 2-3 (ZzzEffect.cpp:6091-6104).
        const [four, six] = at(t).map(s => [s.opts.scale, Math.round((s.opts.seconds as number) * 25), s.end]);
        expect(between(four[0], 0.7, 0.9) && between(four[1], 5, 6) && four[2] === t + (four[1] as number)).toBe(true);
        expect(between(six[0], 1.2, 1.6) && between(six[1], 2, 3) && six[2] === t + (six[1] as number)).toBe(true);
      }
      // Drawn bright at Light (0.4, 0.4, 0.6) x 0.3 (ZzzObject.cpp:2452-2458).
      expect(new Set(heads.map(s => JSON.stringify(s.opts.colour)))).toEqual(new Set([JSON.stringify([0.12, 0.12, 0.18])]));
    }
  });
});

describe('Dragon Roar (264): the dragon on BLOW_OF_DESTRUCTION\'s LifeTime, BITMAP_LAVA\'s waves and fire past DRAGONLORE key 5', () => {
  const LORE = PlayerAction.PLAYER_SKILL_DRAGONLORE;
  const dragons = (r: Run) => r.spawns.filter(s => s.name === 'summon' && String(s.opts.model).endsWith('/knight_plancrack_dragon.glb'));
  const dragon = (r: Run) => dragons(r).map(s => s.tick);
  const waves = (r: Run, model: string) => r.spawns.filter(s => s.name === 'model' && s.opts.model === model);

  it('MODEL_DRAGON_LOWER_DUMMY, not a dragon head: 55 cm from the caster toward his target, 10 cm over the ground, Scale 0.8, Angle[2] 45-224 (MoveHandlers.cpp:7650-7661, ZzzEffect.cpp:6149-6161)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const r = run(264, LORE, { keysPerTick: 0.3, area: true });
    random.mockRestore();
    expect(r.spawns.filter(s => String(s.opts.model).includes('dragonhead'))).toEqual([]);
    const [d] = dragons(r);
    // The target stands 3, 4 tiles off: 0.55 tiles along (0.6, 0.8).
    expect([d.at.x, d.at.y, d.at.z]).toEqual([expect.closeTo(100.33, 5), expect.closeTo(0.1, 5), expect.closeTo(100.44, 5)]);
    const o = d.opts as { scale: number; yaw: number; keysPerTick: number; seconds: number; meshes: { colour: number[]; scrollV: (now: number) => number }[]; drive: (b: { alpha: number }, t: number) => void };
    // rand() % 180 is 90: Angle[2] 135, the node turned the other way.
    expect([o.scale, o.yaw]).toEqual([0.8, expect.closeTo((-135 * Math.PI) / 180, 6)]);
    // Grandmark2 and grandmark in (1, 0.8, 0.2), lines2 in (1, 0.2, 0.1), all scrolling V -(WorldTime % 2000) x 0.0001 (ZzzObject.cpp:2536-2550).
    expect(o.meshes.map(m => m.colour)).toEqual([[1, 0.8, 0.2], [1, 0.2, 0.1], [1, 0.8, 0.2]]);
    expect(o.meshes.map(m => m.scrollV(1.5))).toEqual([-0.15, -0.15, -0.15].map(v => expect.closeTo(v, 6)));
    expect(o.meshes[0].scrollV(2.5)).toBeCloseTo(-0.05, 6);
    // 0.3 keys a move and 0.05 a draw (ZzzEffect.cpp:9555-9561); Alpha x0.96 a move; past key 1 (move 3) 80 moves are left.
    expect(o.keysPerTick).toBeCloseTo(0.35, 6);
    const body = { alpha: 1 };
    o.drive(body, 10);
    expect(body.alpha).toBeCloseTo(0.96 ** 10, 6);
    expect(Math.round(o.seconds * 25)).toBe(82);
  });

  it('the screen shakes while the blow\'s LifeTime is 35 to 15, ticks 16-36: EarthQuake (rand() % 8 - 4) x 0.1 (MoveHandlers.cpp:7641-7648)', () => {
    const quakes = run(264, LORE, { keysPerTick: 0.3, area: true }).spawns.filter(s => s.name === 'quake');
    expect(quakes.map(s => [s.tick, Math.round((s.opts.seconds as number) * 25), s.opts.min, s.opts.max])).toEqual([[16, 22, -0.4, 0.3]]);
  });

  it('BITMAP_LIGHT_RED sub4 where the dragon is let out: flare01_red 3 tiles across, drawn twice at LifeTime x 0.01 for its LifeTime 50 (ZzzEffect.cpp:6030-6056, :9563-9599)', () => {
    const r = run(264, LORE, { keysPerTick: 0.3, area: true, ticks: 80 });
    const decals = r.draws.filter(d => d.kind === 'decal' && d.args[0] === TEX.flareRed);
    expect([...new Set(decals.map(d => d.tick))]).toEqual(range(21, 70));
    expect(decals.filter(d => d.tick === 21).map(d => [d.args[2], d.args[3], d.args[4], d.args[6]])).toEqual([
      [expect.closeTo(100.33, 5), expect.closeTo(100.44, 5), 3, expect.closeTo(0.5, 6)],
      [expect.closeTo(100.33, 5), expect.closeTo(100.44, 5), 3, expect.closeTo(0.5, 6)],
    ]);
    expect(decals.filter(d => d.tick === 70).map(d => d.args[6])).toEqual([expect.closeTo(0.01, 6), expect.closeTo(0.01, 6)]);
  });

  it('the dummy throws a SPARK sub12 from 250 cm up in its Light (1, 0.2, 0.1) each move its key is past 1 and short of 6: moves 3-17, ticks 24-38 (MoveHandlers.cpp:10027-10034)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const r = run(264, LORE, { keysPerTick: 0.3, area: true, leaveAt: 3, ticks: 60 });
    random.mockRestore();
    const red = (tick: number) => r.draws.filter(d => d.kind === 'sprite' && d.tick === tick && d.args[0] === TEX.spark2 && (d.args[1] as number[])[1] === 0.2).length;
    expect([23, 24, 25, 38, 39].map(red)).toEqual([0, 1, 2, 15, 15]);
  });

  it('between DRAGONLORE keys 2 and 8, a BITMAP_LAVA joint on bone 36 and one on bone 28 for each tenth of a key the clip runs a tick: 20 cm wide, Light x0.8 a move, 10 moves (MoveHandlers.cpp:9933-9953, ZzzEffectJoint.cpp:2742-2752, :6917-6939)', () => {
    const r = run(264, LORE, { keysPerTick: 0.3, area: true, ticks: 40 });
    const lava = r.draws.filter(d => d.kind === 'push' && (d.args[0] as { texture: string }).texture === TEX.lava);
    const at = (tick: number) => lava.filter(d => d.tick === tick);
    // Keys 2.1-7.8: ticks 7-26, three tenths a tick so six joints, each laying a tail ten moves.
    expect([6, 7, 8, 16, 26, 27, 35, 36].map(t => at(t).length)).toEqual([0, 6, 12, 60, 60, 54, 6, 0]);
    const [first] = at(7);
    const o = first.args[0] as { maxTails: number; faces: string };
    expect([o.maxTails, o.faces, first.args[1], first.args[5]]).toEqual([10, 'flat', expect.closeTo(0.8, 6), expect.closeTo(0.1, 6)]);
  });

  it('the dragon on tick 21 (LifeTime 50 reaches 30, MoveHandlers.cpp:7650-7666), the waves past key 5 (tick 17 at 0.3 a tick)', () => {
    for (const skill of [264, 560]) {
      const r = run(skill, LORE, { keysPerTick: 0.3, area: true });
      expect(dragon(r)).toEqual([21]);
      expect(waves(r, MODEL.shockwave).map(s => s.tick)).toEqual([17]);
      expect(waves(r, MODEL.shockwaveGround).map(s => s.tick)).toEqual([17]);
    }
  });

  it('no waves and no fire when the clip is left before key 5; the dragon comes anyway', () => {
    const r = run(264, LORE, { keysPerTick: 0.3, area: true, leaveAt: 15 });
    expect(dragon(r)).toEqual([21]);
    expect(waves(r, MODEL.shockwave)).toEqual([]);
    expect(drawTicks(r, TEX.fireHik1)).toEqual([]);
  });

  it('MODEL_SHOCKWAVE01 sub1 on the caster: Scale x1.24, Light x 5 x 0.45 a move on Damage2, for 5 / PlaySpeed ticks (ZzzEffect.cpp:5884-5888, MoveHandlers.cpp:9383-9395, ZzzObject.cpp:2462-2467)', () => {
    const [wave] = waves(run(264, LORE, { keysPerTick: 0.3, area: true }), MODEL.shockwave);
    const { seconds, colour, texture, angle, scaleAt, blendLight } = wave.opts as { seconds: number; colour: number[]; texture: string; angle: number[]; scaleAt: (t: number) => number; blendLight: (t: number) => number };
    expect([Math.round(seconds * 25), colour, texture, scaleAt(2 / 25)]).toEqual([17, [1, 0.12, 0], TEX.damage2, expect.closeTo(1.24 ** 2)]);
    expect(angle[2]).toBeCloseTo(0.5 * (180 / Math.PI));
    expect([blendLight(2 / 25), blendLight(9 / 25)]).toEqual([expect.closeTo(5 * 0.45 ** 2), 0]);
  });

  it('MODEL_SHOCKWAVE_GROUND01 sub1 where the lava lies: LifeTime 50, Scale x1.2 and Light x 6 x 0.9 a move on Kwave2 (ZzzEffect.cpp:6123-6128, MoveHandlers.cpp:9806-9810, ZzzObject.cpp:2520-2525)', () => {
    const [ground] = waves(run(264, LORE, { keysPerTick: 0.3, area: true }), MODEL.shockwaveGround);
    const { seconds, colour, texture, scaleAt, blendLight } = ground.opts as { seconds: number; colour: number[]; texture: string; scaleAt: (t: number) => number; blendLight: (t: number) => number };
    expect([Math.round(seconds * 25), colour, texture, scaleAt(2 / 25), blendLight(2 / 25)]).toEqual([50, [1, 0.1, 0], TEX.kwave2, expect.closeTo(1.44), expect.closeTo(6 * 0.81)]);
  });

  it('each tick past key 5 a flame climbing 7 cm a tick and four FIRE_HIK1 sub5 round it, each with a SPARK sub12 from 250 cm up (MoveHandlers.cpp:9969-10014)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const r = run(264, LORE, { keysPerTick: 0.3, area: true, leaveAt: 19 });
    random.mockRestore();
    // rand() % 3 is 1: the middle flame is BITMAP_FIRE_CURSEDLICH sub4; the four round it firehik01. Fire on ticks 17 and 18.
    const born = (texture: string, tick: number) => r.draws.filter(d => d.kind === 'sprite' && d.tick === tick && d.args[0] === texture);
    expect([born(TEX.fireCursedLich, 17).length, born(TEX.fireHik1, 17).length, born(TEX.spark2, 17).length]).toEqual([1, 4, 4]);
    expect([born(TEX.fireCursedLich, 18).length, born(TEX.fireHik1, 18).length]).toEqual([2, 8]);
    const [first] = born(TEX.fireCursedLich, 17);
    const [second] = born(TEX.fireCursedLich, 18).slice(-1);
    // (80 - LifeTime) x 7 cm: the lava's LifeTime is 80 on tick 17 and 79 on 18; each flame climbs 6.4-8.7 cm a move.
    expect((second.args[3] as number) - (first.args[3] as number)).toBeCloseTo(0.07);
    // firehik02 64 px x (0.72 + 0.36) x (1.8 + 0.2), less 0.07 on its first move; Alpha 0.3 on its first move.
    expect([first.args[5], first.args[8]]).toEqual([expect.closeTo(0.64 * (1.08 * 2 - 0.07)), expect.closeTo(0.3)]);
    // The round flames take half the Light.
    expect(born(TEX.fireHik1, 17)[0].args[8]).toBeCloseTo(0.15);
    // A spark: Spark02 4 px x (1.5 + 0.6), from 250 cm above sea level.
    const [spark] = born(TEX.spark2, 17);
    expect(spark.args[5]).toBeCloseTo(0.04 * 2.1);
    expect(spark.args[3]).toBeGreaterThan(2.5);
  });
});

describe('Dragon Roar (264): a SkillAnimation (0x19) for each target it hits (ReceiveMagic, WSclient.cpp:5130-5143)', () => {
  const LORE = PlayerAction.PLAYER_SKILL_DRAGONLORE;
  const VOLCANO = 'Effect/volcano_of_monk.glb';
  const FIRES: string[] = [TEX.fireHik1, TEX.fireCursedLich, TEX.fireHik3];
  /**
   * The cast at tick 0 (RageCreateEffect's InitLower, MonkSystem.cpp:1277), then a hit on its target before each of the steps of
   * ticks 1 to `hits`, every roll 0: a hit made before a tick's step first moves in it.
   */
  function roar(ticks: number, hits = 5, onTick?: (tick: number, target: Entity | null) => void): Run {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      return run(264, LORE, {
        keysPerTick: 0.3,
        area: true,
        ticks,
        onTick: (t, caster, aim) => {
          onTick?.(t, aim);
          if (t <= hits) playTargetedSkillVisual(scene, 264, caster, aim);
        },
      });
    } finally {
      random.mockRestore();
    }
  }
  const at = (s: Spawn | Draw, x: number, z: number) => ('at' in s ? s.at.x === x && s.at.z === z : s.args[2] === x && s.args[4] === z);
  const volcanoes = (r: Run) => r.spawns.filter(s => s.name === 'model' && s.opts.model === VOLCANO);

  it('MODEL_VOLCANO_OF_MONK by the cast\'s hit count: sub1 on the first at once (Scale 0.8), sub2 and sub3 erupting as a sub1 (Scale 1) on their LifeTime 2, none on the fourth and on (MonkSystem.cpp:1358-1377, ZzzEffect.cpp:6172-6201, MoveHandlers.cpp:10146-10164)', () => {
    const r = roar(60);
    // Each a textured body and mesh 0 again in volcano_core, bright; sub2 lives 20, sub3 30 (rolls 0): made on ticks 2 and 3.
    expect(volcanoes(r).map(s => [s.tick, s.opts.scale, s.opts.blendMesh, s.opts.texture])).toEqual([
      [1, 0.8, -1, undefined],
      [1, 0.8, 0, 'Effect/volcano_core.OZJ'],
      [20, 1, -1, undefined],
      [20, 1, 0, 'Effect/volcano_core.OZJ'],
      [31, 1, -1, undefined],
      [31, 1, 0, 'Effect/volcano_core.OZJ'],
    ]);
    expect(volcanoes(r).every(s => at(s, 103, 104) && s.opts.keysPerTick === 0.6 && Math.round((s.opts.seconds as number) * 25) === 100)).toBe(true);
    // Rage_Dragonlower_Att with each hit (StopBuffer, then PlayBuffer).
    expect(soundTicks(r, 'Sound/Ragefighter/Rage_Dragonlower_Att')).toEqual([1, 2, 3, 4, 5]);
  });

  it('a sub2 or sub3 whose target is gone first makes none', () => {
    const r = roar(60, 2, (t, target) => {
      if (t === 10 && target) (target as { objOutOfScope?: boolean }).objOutOfScope = true;
    });
    expect(volcanoes(r).map(s => s.tick)).toEqual([1, 1]);
  });

  it('sub1: a flame a tick climbing its column, unturned, fading in its last 20 ticks and its core in its last 30; four stones as it is made and at LifeTime 10 with MODEL_SHOCKWAVE_GROUND01 sub2; under it BITMAP_LIGHT_RED sub3 (MoveHandlers.cpp:10093-10144, :9613-9640, ZzzEffect.cpp:9580-9585)', () => {
    // Read before each step: as drawn after the move before it (the first runs in tick 1's step).
    const seen: number[][] = [];
    const r = roar(140, 1, t => {
      const made = vi.mocked(effects.spawn).mock.calls.filter(call => (call[3] as { model?: string } | undefined)?.model === VOLCANO);
      if (made.length < 2 || ![72, 73, 92, 93, 100].includes(t)) return;
      const life = (made[0][3] as { life: (p: number) => number }).life;
      const glow = (made[1][3] as { blendLight: (t: number) => number }).blendLight;
      seen.push([t, +life(0).toFixed(4), +glow(0).toFixed(4)]);
    });
    // Alpha LifeTime x 0.1 under 20, BlendMeshLight LifeTime x 0.03 under 30: after its moves 71, 72, 91, 92 and 99.
    expect(seen).toEqual([
      [72, 1, 1],
      [73, 1, 0.87],
      [92, 1, 0.3],
      [93, 0.9, 0.27],
      [100, 0.2, 0.06],
    ]);
    // The column: firehik01 sub6 (rolls 0), (80 - 100) x 0.9 + 20 cm up on its first move, climbing 2.2 x Gravity, never turned.
    const column = r.draws.filter(d => d.kind === 'sprite' && d.tick === 1 && d.args[0] === TEX.fireHik1 && at(d, 103, 104) && d.args[7] === 0);
    expect(column.map(d => +(d.args[3] as number).toFixed(4))).toEqual([+((2 + 6.4 * 2.2) / 100).toFixed(4)]);
    // 0.8 x 8 x 0.19 x 0.72, less 0.05 on its move.
    expect(column[0].args[5]).toBeCloseTo(0.64 * (0.8 * 8 * 0.19 * 0.72 - 0.05));
    const stones = r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.volcanoStone);
    expect(stones.map(s => s.tick)).toEqual([1, 1, 1, 1, 91, 91, 91, 91]);
    // Scale 1 + 5 x 0.06, less 0.03 on each of its moves, and LifeTime 30 (rolls 0): all have run their 30 by tick 140.
    expect(stones.map(s => [(s.opts.scaleAt as (t: number) => number)(0), Math.round((s.opts.seconds as number) * 25)])).toEqual(Array(8).fill([expect.closeTo(1.3 - 30 * 0.03), 30]));
    const ring = r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwaveGround && at(s, 103, 104));
    expect(ring.map(s => [s.tick, Math.round((s.opts.seconds as number) * 25), s.opts.colour, s.opts.texture])).toEqual([[91, 10, [1, 0.1, 0], undefined]]);
    const fade = ring[0].opts.blendLight as (t: number) => number;
    expect(fade(2 / 25)).toBeCloseTo(6 * 0.7 ** 2);
    // flare01_red 3 tiles across at its LifeTime x 0.01, drawn once a tick.
    const red = r.draws.filter(d => d.kind === 'decal' && d.args[0] === TEX.flareRed && d.args[2] === 103 && d.args[3] === 104);
    expect(red.map(d => d.tick)).toEqual(range(1, 99));
    expect(red[0].args.slice(4)).toEqual([3, 0, expect.closeTo(0.99)]);
  });

  it('TARGETMON_EFFECT: three flames a tick on random bones of the target, turning, for 100 ticks while it is there (MoveHandlers.cpp:10049-10090)', () => {
    const r = roar(130, 1, (t, target) => {
      if (t === 120 && target) (target as { objOutOfScope?: boolean }).objOutOfScope = true;
    });
    // No skeleton: its bones fall back on the body, 90 cm up. Each climbs Gravity (6.4) and turns 3 degrees on its move.
    const born = (tick: number) =>
      r.draws.filter(d => d.kind === 'sprite' && d.tick === tick && FIRES.includes(d.args[0] as string) && at(d, 103, 104) && Math.abs((d.args[3] as number) - (0.9 + 0.064)) < 1e-6);
    expect(born(1).map(d => [d.args[0], +(d.args[7] as number).toFixed(4)])).toEqual(Array(3).fill([TEX.fireHik1, +(3 * DEG).toFixed(4)]));
    expect([born(100).length, born(101).length]).toEqual([3, 0]);
  });
});

describe('The master skills sound as their base: RageCreateEffect plays one sound for each case (MonkSystem.cpp:1089-1301)', () => {
  it.each([
    [551, 260],
    [554, 260],
    [558, 262],
    [559, 263],
    [560, 264],
  ])('%i as %i', (master, base) => {
    expect(skillSound(base)).not.toBeNull();
    expect(skillSound(master)).toBe(skillSound(base));
  });
});

describe('Beast Uppercut (261): MODEL_DOWN_ATTACK_DUMMY_R then _L, on their own keys (MoveHandlers.cpp:9221-9309)', () => {
  const STAMP = PlayerAction.PLAYER_SKILL_STAMP;
  const ATT = 'Sound/Ragefighter/Rage_Stamp_Att';
  const CAST = 'Sound/Ragefighter/Rage_Stamp';

  const BLAST = TEX.sahamuttBlast;

  it('another caster: Rage_Stamp at the packet, the two blows 5 and 17 ticks later at 0.4 a tick', () => {
    for (const skill of [261, 552, 555]) {
      const r = run(skill, STAMP);
      expect(soundTicks(r, CAST)).toEqual([0]);
      expect(spriteTicks(r, BLAST)).toEqual([5, 17]);
      expect(soundTicks(r, ATT)).toEqual([5, 17]);
    }
  });

  it('follows the STAMP PlaySpeed: 0.45 a tick hits 5 and 15 ticks later', () => {
    // v = 0.9: R reaches key 3 on move 5 and key 6 on move 8; L reaches key 5 on its move 7.
    expect(spriteTicks(run(261, STAMP, { keysPerTick: 0.45 }), BLAST)).toEqual([5, 15]);
  });

  it('the hero: the effect waits for STAMP key 2 (SkillCast.cpp:1111-1115), tick 5 at 0.45 a tick', () => {
    const r = run(261, STAMP, { hero: true, keysPerTick: 0.45 });
    expect(soundTicks(r, CAST)).toEqual([5]);
    expect(spriteTicks(r, BLAST)).toEqual([10, 20]);
  });

  it('the hero: nothing if the clip is left before key 2', () => {
    const r = run(261, STAMP, { hero: true, leaveAt: 3 });
    expect(soundTicks(r, CAST)).toEqual([]);
    expect(spriteTicks(r, BLAST)).toEqual([]);
    expect(r.spawns.filter(s => s.name === 'model')).toEqual([]);
  });

  it('each blow is CreateBomb3(target, 3, 0.9), not a gold burst: two loungexflow cards, Magic_Ground2 in (1, 0.5, 0.2), three stones and twenty sparks (ZzzEffect.cpp:6373-6433)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const r = run(261, STAMP);
    random.mockRestore();
    const at = (tick: number, pred: (s: Spawn) => boolean) => r.spawns.filter(s => s.tick === tick && pred(s));
    const cards = at(5, s => s.name === 'sprite' && s.opts.texture === BLAST);
    expect(cards.length).toBe(2);
    // -40..49 cm about the target and 70-169 cm up (rand() % 90 - 40 is 5, rand() % 100 + 70 is 120); 256 px x Scale 0.9.
    expect([cards[0].at.x, cards[0].at.y, cards[0].at.z, cards[0].opts.size]).toEqual([expect.closeTo(103.05, 6), expect.closeTo(1.2, 6), expect.closeTo(104.05, 6), expect.closeTo(2.56 * 0.9, 6)]);
    const [flash] = at(5, s => s.name === 'sprite' && s.opts.texture === TEX.magicGround2);
    expect([flash.opts.colour, flash.opts.size]).toEqual([[1, 0.5, 0.2], expect.closeTo(1.28 * (2.2 * 0.9 + 0.064), 6)]);
    expect(at(5, s => s.name === 'model' && (s.opts.model === MODEL.stone || s.opts.model === MODEL.stone2)).length).toBe(3);
    expect(at(5, s => s.name === 'particles').map(s => s.opts.count)).toEqual([20]);
    expect(r.spawns.filter(s => s.opts.texture === TEX.impact)).toEqual([]);
  });

  it('MODEL_DOWN_ATTACK_DUMMY_R then _L at the caster, at 2 x the STAMP PlaySpeed: R till its key 6 (tick 9), L till its key 8 (tick 20) (ZzzEffect.cpp:5864-5872)', () => {
    const r = run(261, STAMP);
    const dummies = r.spawns.filter(s => s.name === 'model' && String(s.opts.model).includes('_punch.glb'));
    expect(dummies.map(s => [s.tick, String(s.opts.model).split('/').pop(), Math.round((s.opts.seconds as number) * 25), s.opts.keysPerTick, s.opts.scale])).toEqual([
      [0, 'down_left_punch.glb', 9, expect.closeTo(0.8, 6), 0.9],
      [9, 'down_right_punch.glb', 11, expect.closeTo(0.8, 6), 0.9],
    ]);
    // The gold blur that stood in for them is gone.
    expect(r.spawns.filter(s => s.name === 'blur')).toEqual([]);
  });

  it('each move a FORCEPILLAR joint off the dummy\'s bone 0, 50 cm wide, riding it 7 moves, and a Flare 320 cm across at it (MoveHandlers.cpp:9241-9254, ZzzEffectJoint.cpp:2709-2717, :6874-6884)', () => {
    const r = run(261, STAMP);
    const pushes = (tick: number) => r.draws.filter(d => d.tick === tick && d.kind === 'push' && (d.args[0] as { texture: string }).texture === TEX.forcePillar);
    // R's joints go with it on tick 9; L moves first on tick 10.
    expect([1, 2, 7, 8, 9, 10, 11].map(t => pushes(t).length)).toEqual([1, 2, 7, 7, 0, 1, 2]);
    const [first] = pushes(1);
    expect([(first.args[0] as { colour: number[] }).colour, first.args[5]]).toEqual([[0.95, 0.72, 0.48], expect.closeTo(0.25, 6)]);
    const flares = drawTicks(r, TEX.flareBig);
    expect(flares).toEqual(range(1, 20).map(t => [t, 1]));
    const flare = r.draws.find(d => d.tick === 1 && d.args[0] === TEX.flareBig) as Draw;
    expect([flare.args[1], flare.args[5]]).toEqual([[0.47, 0.36, 0.24], expect.closeTo(3.2, 6)]);
  });

  it('with no target, none of it past the blow key: each dummy returns before it (MoveHandlers.cpp:9235-9236, :9282-9283)', () => {
    const r = run(261, STAMP, { target: false });
    expect(spriteTicks(r, BLAST)).toEqual([]);
    expect(soundTicks(r, ATT)).toEqual([]);
    // R's keys 0-2.4 on its moves 1-4; L's keys 0-4.8 on its moves 1-7, ticks 10-16.
    expect(drawTicks(r, TEX.flareBig).map(([t]) => t)).toEqual([...range(1, 4), ...range(10, 16)]);
  });

  it('the cast sound left the click: the effect plays it', () => {
    expect(skillSound(261)).toBeNull();
  });
});

describe('Killing Blow (260): BITMAP_SBUMB on its LifeTime (MoveHandlers.cpp:9196-9216)', () => {
  const THRUST = PlayerAction.PLAYER_SKILL_THRUST;
  const ATT = 'Sound/Ragefighter/Rage_Thrust_Att';

  it('a burst on the target each tick 5-20, Rage_Thrust_Att on ticks 6, 12 and 15', () => {
    for (const skill of [260, 551, 554]) {
      const r = run(skill, THRUST);
      expect(spriteTicks(r, 'Effect/sbumb.OZJ')).toEqual(range(5, 20));
      expect(soundTicks(r, ATT)).toEqual([6, 12, 15]);
    }
  });

  it('nothing on the target without one', () => {
    const r = run(260, THRUST, { target: false });
    expect(spriteTicks(r, 'Effect/sbumb.OZJ')).toEqual([]);
    expect(soundTicks(r, ATT)).toEqual([]);
  });

  it('MODEL_WOLF_HEAD_EFFECT on bone 27, lit by the ground under it: while its LifeTime is 3 or more it throws a sub1, a sub2 and three BITMAP_PIN_LIGHT joints a move (MoveHandlers.cpp:9137-9182)', () => {
    // rand() % n is n / 2: yaw and pitch shaken by +8, sub1 Scale 1.4 for 3 ticks, sub2 0.9 for 4, pins at 45 cm a tick for 2.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const skill of [260, 551, 554]) {
        const r = run(skill, THRUST);
        const heads = r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.wolfHead);
        const at = (t: number) => heads.filter(s => s.tick === t);
        // LifeTime 10 / 0.4 = 25: it throws on its moves 1-23 and dies on move 25.
        expect([0, ...range(1, 25)].map(t => at(t).length)).toEqual([1, ...range(1, 23).map(() => 2), 0, 0]);
        const head = at(0)[0];
        // Turned to the target (MonkSystem.cpp:1097-1099); the terrain light under it is its BodyLight (white with no map).
        const toTarget = (Math.atan2(3, -4) * 180) / Math.PI;
        expect([head.opts.scale, head.end, head.opts.colour]).toEqual([1, 25, [1, 1, 1]]);
        expect((head.opts.angle as number[])[2]).toBeCloseTo(toTarget);
        // Scale 1.5 from its first move: by the end of the run it has moved.
        expect((head.opts.scaleAt as (t: number) => number)(0)).toBe(1.5);
        const [one, two] = at(1).map(s => [s.opts.scale, Math.round((s.opts.seconds as number) * 25), (s.opts.angle as number[])[0], (s.opts.angle as number[])[2]]);
        expect(one).toEqual([expect.closeTo(1.4), 3, 8, expect.closeTo(toTarget + 8)]);
        expect(two).toEqual([expect.closeTo(0.9), 4, 8, expect.closeTo(toTarget + 8)]);
        // Each pin: a start tail and its first move's tail on the tick it is made, its second the tick after; 5 cm wide.
        const pins = r.draws.filter(d => d.kind === 'push' && (d.args[0] as { texture: string }).texture === TEX.pinLights);
        const born = pins.filter(d => d.args[1] === 1);
        expect(range(1, 23).map(t => born.filter(d => d.tick === t).length)).toEqual(range(1, 23).map(() => 3));
        expect(born.filter(d => d.tick > 23)).toEqual([]);
        expect(pins).toHaveLength(23 * 3 * 3);
        const [x0, y0, z0, half] = born[0].args.slice(2) as number[];
        const [x1, y1, z1] = pins[1].args.slice(2) as number[];
        expect(half).toBeCloseTo(0.025);
        expect(Math.hypot(x1 - x0, y1 - y0, z1 - z0)).toBeCloseTo(0.45);
        // Pitched down 8 degrees.
        expect((y0 - y1) / 0.45).toBeCloseTo(Math.sin((8 * Math.PI) / 180));
        expect(pins[1].args[1]).toBeCloseTo(0.9);
      }
    } finally {
      random.mockRestore();
    }
  });
});

describe('Charge (269): AttackStage\'s AT_SKILL_OCCUPY case (ZzzCharacter.cpp:2934-2959, :4690-4695)', () => {
  const RUSH = PlayerAction.PLAYER_ATTACK_RUSH;
  /** The ticks of the charge's sprays, 20 cm over the feet (the sword force's are on the ground). */
  const sprays = (r: Run) => [...new Set(r.spawns.filter(s => s.name === 'particles' && s.opts.recipe === JOINT_SPARKS && Math.abs(s.at.y - 0.2) < 1e-6).map(s => s.tick))];

  it('each tick of the charge, 20 cm over the feet: four JOINT_SPARK sub0 thrown back and four BITMAP_FIRE sub18 ground smokes (ZzzCharacter.cpp:2942-2957)', () => {
    const r = run(269, RUSH, { keysPerTick: 0.3 });
    const smokes = (s: Spawn) => (s.opts.recipe as { texture?: string } | undefined)?.texture === TEX.groundSmoke;
    const at = (t: number) => r.spawns.filter(s => s.tick === t && s.name === 'particles' && (s.opts.recipe === JOINT_SPARKS || smokes(s)));
    expect(range(1, 14).map(t => at(t).length)).toEqual(range(1, 14).map(() => 8));
    const smoke = at(1).find(s => s.opts.recipe !== JOINT_SPARKS)?.opts.recipe as { texture: string; blend: string; size: number; life: number };
    // ground_smoke 128 px x Scale 1.5, alpha-blended (EnableAlphaBlend3), LifeTime 24 (ZzzEffectParticle.cpp:481-488, :9151-9154).
    expect([smoke.texture, smoke.blend, smoke.size, Math.round(smoke.life * 25)]).toEqual([TEX.groundSmoke, 'alpha', expect.closeTo(1.92), 24]);
    // Thrown back along the caster's facing, pitched 150-209 degrees.
    const heading = at(1)[0].opts.heading as Vector3;
    expect(heading.x * Math.sin(0.5) - heading.z * Math.cos(0.5)).toBeLessThan(0);
    expect(at(1)[0].at.y).toBeCloseTo(0.2);
  });
  const forces = (r: Run) => r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.swordForce);
  /** The ticks the sword force leaves on, not its copies. */
  const force = (r: Run) => forces(r).filter(s => s.opts.scale !== 3.5).map(s => s.tick);
  const volley = (r: Run) => r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.multishot).map(s => s.tick);

  it('sprays every tick until AttackTime runs out on tick 14 at 0.3 keys a tick, then the sword force', () => {
    const r = run(269, RUSH, { keysPerTick: 0.3 });
    expect(sprays(r)).toEqual(range(1, 14));
    expect(force(r)).toEqual([14]);
  });

  it('releases on the tick RUSH passes key 5 at a faster clip', () => {
    const r = run(269, RUSH, { keysPerTick: 0.5 });
    expect(sprays(r)).toEqual(range(1, 11));
    expect(force(r)).toEqual([11]);
  });

  it('the sword force, MODEL_SWORD_FORCE sub2 in knightSt_blue: 100 cm up, running 10 + 2k cm on move k, Scale +0.9 for three moves then -0.05, BlendMeshLight LifeTime / 18 from move 4 (ZzzEffect.cpp:4531-4548, MoveHandlers.cpp:7154-7212, ZzzObject.cpp:2566-2570)', () => {
    const [blade, ...copies] = forces(run(269, RUSH, { keysPerTick: 0.3, ticks: 40 }));
    // Made on the release tick and moved in it (MoveCharactersClient before MoveEffects, MainScene.cpp:284-290); dead after move 15.
    expect([blade.tick, blade.opts.texture, Math.round((blade.opts.seconds as number) * 25)]).toEqual([14, TEX.knightStBlue, 14]);
    expect([blade.at.x, blade.at.y, blade.at.z]).toEqual([expect.closeTo(100 + 0.12 * Math.sin(0.5)), expect.closeTo(1), expect.closeTo(100 - 0.12 * Math.cos(0.5))]);
    const { scaleAt, intensity } = blade.opts as { scaleAt: (t: number) => number; intensity: (t: number) => number };
    expect([0, 2, 3, 13].map(k => scaleAt(k / 25))).toEqual([0.9, 2.7, 2.65, 2.15].map(v => expect.closeTo(v)));
    // BodyLight (the terrain's, 1 here, + Light) x BlendMeshLight, clamped: 1, then (1 + l) x l with l = LifeTime / 18.
    expect([intensity(0), intensity(9 / 25)]).toEqual([1, expect.closeTo((1 + 6 / 18) * (6 / 18))]);
    // On moves 1-3 a sub3 copy where it was: Scale 3.5, LifeTime 5, BlendMeshLight LifeTime / 10, in knightSt_blue too.
    expect(copies.map(s => [s.tick, s.opts.scale, s.opts.texture, Math.round((s.opts.seconds as number) * 25)])).toEqual([14, 15, 16].map(t => [t, 3.5, TEX.knightStBlue, 5]));
    expect([copies[0].at.x, copies[0].at.z]).toEqual([expect.closeTo(100), expect.closeTo(100)]);
    // Neither has the stand-in's fire tint or growth.
    expect([blade.opts.colour, blade.opts.grow]).toEqual([undefined, undefined]);
  });

  it('from its move 4 to 15, four JOINT_SPARK and four BITMAP_FIRE sub18 a tick on the ground under it, in its Light (MoveHandlers.cpp:7182-7199)', () => {
    const r = run(269, RUSH, { keysPerTick: 0.3, ticks: 40 });
    const ground = r.spawns.filter(s => s.name === 'particles' && s.tick > 14);
    const on = [...new Set(ground.map(s => s.tick))];
    expect(on).toEqual(range(17, 28));
    expect(on.map(t => ground.filter(s => s.tick === t).length)).toEqual(on.map(() => 8));
    const smoke = ground.find(s => s.opts.recipe !== JOINT_SPARKS)?.opts.recipe as { texture: string; colour: number[]; colourEnd: number[] };
    expect([smoke.texture, smoke.colour[0], smoke.colourEnd[0]]).toEqual([TEX.groundSmoke, expect.closeTo(12 / 18), expect.closeTo(0.29 * (12 / 18))]);
    expect(ground[0].at.y).toBeCloseTo(0);
  });

  it('its AddTerrainLight (1, 0.8, 0.6), range 1, every move (MoveHandlers.cpp:7201-7202)', () => {
    const body = vi.spyOn(lighting, 'skillBody');
    run(269, RUSH, { keysPerTick: 0.3, ticks: 20 });
    expect(body.mock.calls.map(c => [c[1], c[2]])).toEqual([[269, 'force']]);
    body.mockRestore();
    expect(SKILL_LIGHTS[269]?.bodies?.force).toMatchObject({ color: [1, 0.8, 0.6], range: 1 });
  });

  it('SOUND_SKILL_SWORD2 at the packet (WSclient.cpp:5123-5129)', () => {
    expect(skillSound(269)).toBe('Sound/sKnightSkill2');
  });

  it('the MULTI_SHOT volley only on the hero\'s own cast (MonkSystem.cpp:1305-1333)', () => {
    expect(volley(run(269, RUSH, { hero: true }))).toEqual([0, 0, 0]);
    expect(volley(run(269, RUSH))).toEqual([]);
  });
});

describe('The MULTI_SHOT volley: Multi-Shot, Dragon Slasher and Charge (WSclient.cpp:5381-5410, MonkSystem.cpp:1225-1258, :1305-1331)', () => {
  /** [model, LifeTime, Scale a move, cm ahead] of each, in the order made. */
  const VOLLEY: [string, number, number, number][] = [
    ...[0, 1].map((): [string, number, number, number] => [MODEL.multishot3, 12, 0.25, 40]),
    ...[0, 1, 2].map((): [string, number, number, number] => [MODEL.multishot, 16, 0.2, 60]),
    ...[0, 1].map((): [string, number, number, number] => [MODEL.multishot2, 13, 0.3, 40]),
  ];
  const shots = (r: Run) => r.spawns.filter(s => s.name === 'model' && String(s.opts.model).startsWith('Effect/multishot0'));

  /** Where the original puts each: 10 cm aside, `ahead` cm along `yaw` and 135 cm up (ZzzEffect.cpp:1665-1668). */
  const placed = (yaw: number, ahead: number): number[] => {
    const r = (yaw * Math.PI) / 180;
    return [100 + (-10 * Math.cos(r) + ahead * Math.sin(r)) / 100, 1.35, 100 + (-10 * Math.sin(r) - ahead * Math.cos(r)) / 100].map(v => Math.round(v * 1000) / 1000);
  };

  it('stays where it is made, unturned, from Scale 0 growing a move, at Light (0.8, 0.9, 1.6) x LifeTime / 18 (ZzzEffect.cpp:1636-1700, MoveHandlers.cpp:304-329)', () => {
    const yaw = 0.5 * (180 / Math.PI);
    const r = run(269, PlayerAction.PLAYER_ATTACK_RUSH, { hero: true });
    const made = shots(r);
    expect(made.map(s => [s.opts.model, Math.round((s.opts.seconds as number) * 25)])).toEqual(VOLLEY.map(([m, life]) => [m, life]));
    VOLLEY.forEach(([, life, grow, ahead], i) => {
      const { scale, scaleAt, blendLight, colour, angle, follow, keysPerTick } = made[i].opts as {
        scale: number; scaleAt: (t: number) => number; blendLight: (t: number) => number; colour: number[]; angle: number[]; follow?: unknown; keysPerTick: number;
      };
      expect([made[i].tick, scale, scaleAt(3 / 25), blendLight(3 / 25), colour, follow, keysPerTick]).toEqual([0, 0, expect.closeTo(grow * 3), expect.closeTo((life - 2) / 18), [0.8, 0.9, 1.6], undefined, expect.closeTo(1 / 6)]);
      expect(angle[2]).toBeCloseTo(yaw);
      expect([made[i].at.x, made[i].at.y, made[i].at.z].map(v => Math.round(v * 1000) / 1000)).toEqual(placed(yaw, ahead));
    });
  });

  it('Dragon Slasher aims it at the target, and makes none without one (MonkSystem.cpp:1226-1233)', () => {
    const toTarget = (Math.atan2(3, -4) * 180) / Math.PI;
    const made = shots(run(265, PlayerAction.PLAYER_SKILL_DRAGONKICK, { leaveAt: 26, ticks: 40 }));
    expect(made).toHaveLength(7);
    for (const s of made) expect((s.opts.angle as number[])[2]).toBeCloseTo(toTarget);
    expect([made[2].at.x, made[2].at.y, made[2].at.z].map(v => Math.round(v * 1000) / 1000)).toEqual(placed(toTarget, 60));
    expect(shots(run(265, PlayerAction.PLAYER_SKILL_DRAGONKICK, { leaveAt: 26, ticks: 40, target: false }))).toEqual([]);
  });
});

describe('Ignore Defense, Increase Health, Increase Block (266-268): RageCreateEffect\'s wind pillar (MonkSystem.cpp:1150-1209)', () => {
  const PILLARS: [readonly number[], readonly number[]][] = [
    [[266], [0.5, 0.55, 1]],
    [[267, 573], [0.85, 0.2, 1]],
    [[268, 569, 572], [1, 0.2, 0]],
  ];

  it('a slow pillar of 50 ticks at the caster, and the fast two it raises on ticks 11 and 21 in its Light (MoveHandlers.cpp:9529-9554)', () => {
    for (const [skills, colour] of PILLARS) {
      for (const skill of skills) {
        // Increase Block's lasting sub1 is below.
        const pillars = run(skill, PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES).spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.windForce && s.opts.seconds !== Infinity);
        expect(pillars.map(s => [s.tick, s.opts.colour, Math.round((s.opts.seconds as number) * 25)])).toEqual([
          [0, colour, 50],
          [11, colour, 70],
          [21, colour, 70],
        ]);
        // Light x 6 keeping 0.9 a tick; the turn at 0.3 degrees a ms of WorldTime, the sub 3s at 0.9.
        const { blendLight, spin } = pillars[0].opts as { blendLight: (t: number) => number; spin: number };
        expect(blendLight(2 / 25)).toBeCloseTo(6 * 0.9 ** 2);
        expect(spin).toBeCloseTo((300 * Math.PI) / 180);
        expect(pillars[1].opts.spin).toBeCloseTo((900 * Math.PI) / 180);
      }
    }
  });

  /** [skills, BITMAP_SWORD_EFFECT_MONO's Light, its shock wave's Light] (MonkSystem.cpp:1136-1140, MoveHandlers.cpp:9714-9728). */
  const FLASHES: [readonly number[], number[], number[]][] = [
    [[266], [0.2, 0.4, 1], [0.4, 0.4, 1]],
    [[267, 573], [0.5, 0.28, 1], [0.7, 0.5, 1]],
    [[268, 569, 572], [1, 0.15, 0], [1, 0.12, 0]],
  ];
  /** The particle's Scale after `n` moves: x1.2 until past 6, then x0.8 (ZzzEffectParticle.cpp:8861-8886). */
  const monoScale = (n: number): number => (n <= 10 ? 1.2 ** n : 1.2 ** 10 * 0.8 ** (n - 10));

  it('BITMAP_SWORD_EFFECT_MONO at the caster, not a flash: a Swordeff_mono particle each tick LifeTime 3 does not divide (MoveHandlers.cpp:9705-9730)', () => {
    for (const [skills, light] of FLASHES) {
      for (const skill of skills) {
        const r = run(skill, PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES);
        expect(r.spawns.filter(s => s.name === 'sprite' && s.opts.texture === TEX.shiny)).toEqual([]);
        const monos = r.draws.filter(d => d.kind === 'sprite' && d.args[0] === TEX.swordEffMono);
        // A particle moves in the frame it is made: Scale 1.2 on its first tick.
        const born = monos.filter(d => Math.abs((d.args[5] as number) - (64 * 0.9 * 1.2) / 100) < 1e-6).map(d => d.tick);
        expect(born).toEqual([2, 3, 5, 6, 8, 9, 11, 12, 14, 15]);
        // Each is drawn after its moves 1-18: 64 px x Scale x 0.9 by x 1.1, 31 cm x Scale up, Light x0.94 a move but the 10th.
        expect(monos.length).toBe(10 * 18);
        expect(Math.max(...monos.map(d => d.tick))).toBe(32);
        // Tick 2's particle on its 10th move (tick 11), the move it turns on.
        const first = monos.filter(d => d.tick === 11 && Math.abs((d.args[5] as number) - (64 * 0.9 * monoScale(10)) / 100) < 1e-6);
        expect(first).toHaveLength(1);
        const [, colour, , y, , , h, roll, lum] = first[0].args as [string, number[], number, number, number, number, number, number, number];
        expect(colour).toEqual(light);
        expect(y).toBeCloseTo((31 * monoScale(10)) / 100);
        expect(h).toBeCloseTo((64 * 1.1 * monoScale(10)) / 100);
        expect(roll).toBe(0);
        expect(lum).toBeCloseTo(0.94 ** 9);
      }
    }
  });

  /** [skills, BITMAP_EVENT_CLOUD's Light, BITMAP_MAGIC sub13's Light] (MonkSystem.cpp:1147-1154, :1175-1182, :1205-1212). */
  const DECALS: [readonly number[], number[], number[]][] = [
    [[266], [0.65, 0.8, 1], [0.5, 0.55, 0.9]],
    [[267, 573], [0.8, 0.4, 1], [0.78, 0.2, 1]],
    [[268, 569, 572], [1, 0.3, 0.2], [1, 0.15, 0]],
  ];

  it('the ground decals at the caster: BITMAP_MAGIC sub13 drawn twice and three BITMAP_EVENT_CLOUD (MonkSystem.cpp:1142-1154)', () => {
    for (const [skills, cloud, magic] of DECALS) {
      for (const skill of skills) {
        const rings = run(skill, PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES).spawns.filter(s => s.name === 'ring');
        const at = (s: Spawn) => [s.tick, s.opts.texture, s.opts.colour, Math.round((s.opts.seconds as number) * 25)];
        // Magic_Ground1 dies past Scale 8 (move 22); the clouds live 30.
        expect(rings.map(at)).toEqual([
          ...[0, 1, 2].map(() => [0, TEX.eventCloud, cloud, 30]),
          ...[0, 1].map(() => [0, TEX.magicGround, magic, 22]),
        ]);
        type Curves = { scaleAt: (t: number) => number; brightness: (t: number) => number; spin?: number; spinFrom?: number };
        // Magic_Ground1: Scale x1.1 and Light x0.95 a move, halved again past Scale 4 (move 15), at the caster's facing.
        const magicRing = rings.filter(s => s.opts.texture === TEX.magicGround)[0].opts as Curves;
        expect([1, 15, 21].map(n => magicRing.scaleAt(n / 25))).toEqual([1.1, 1.1 ** 15, 1.1 ** 21]);
        expect(magicRing.brightness(14 / 25)).toBeCloseTo(0.95 ** 14);
        expect(magicRing.brightness(16 / 25)).toBeCloseTo(0.95 ** 16 * 0.25);
        expect(magicRing.spinFrom).toBeCloseTo(-0.5 * (180 / Math.PI));
        // clouds2: Scale x1.08 a move up to 3, Light x0.9, turning -0.5 degrees a ms.
        const cloudRing = rings.filter(s => s.opts.texture === TEX.eventCloud)[0].opts as Curves;
        expect([1, 14, 15].map(n => cloudRing.scaleAt(n / 25))).toEqual([1.08, 1.08 ** 14, 3]);
        expect(cloudRing.brightness(3 / 25)).toBeCloseTo(0.9 ** 3);
        expect(cloudRing.spin).toBe(-500);
      }
    }
  });

  it('three MODEL_SHOCKWAVE_GROUND01 at the caster, Scale 1, 0.85 and 0.7, growing x1.2 a move at Light x 6 x 0.8 a move (MonkSystem.cpp:1142-1146, MoveHandlers.cpp:9803-9822)', () => {
    const RINGS: [readonly number[], number[]][] = [
      [[266], [0.6, 0.65, 1]],
      [[267, 573], [1, 0.35, 1]],
      [[268, 569, 572], [1, 0.1, 0]],
    ];
    for (const [skills, light] of RINGS) {
      for (const skill of skills) {
        const rings = run(skill, PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES).spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwaveGround);
        type Curves = { scaleAt: (t: number) => number; blendLight: (t: number) => number; angle: number[] };
        expect(rings.map(s => [s.tick, s.opts.colour, Math.round((s.opts.seconds as number) * 25), (s.opts as Curves).scaleAt(0)])).toEqual([
          [0, light, 20, 1],
          [0, light, 20, 0.85],
          [0, light, 20, 0.7],
        ]);
        const { scaleAt, blendLight, angle } = rings[1].opts as Curves;
        expect(scaleAt(2 / 25)).toBeCloseTo(0.85 * 1.2 ** 2);
        expect(blendLight(3 / 25)).toBeCloseTo(6 * 0.8 ** 3);
        expect(angle[2]).toBeCloseTo(0.5 * (180 / Math.PI));
      }
    }
  });

  it('its MODEL_SHOCKWAVE01 sub 2, drawn twice, on LifeTime 14 (tick 2): Scale x1.24 and Light x 15 x 0.45 a move (ZzzEffect.cpp:5874-5893, MoveHandlers.cpp:9383-9395)', () => {
    for (const [skills, , wave] of FLASHES) {
      for (const skill of skills) {
        const waves = run(skill, PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES).spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwave);
        expect(waves.map(s => [s.tick, s.opts.colour, Math.round((s.opts.seconds as number) * 25)])).toEqual([
          [2, wave, 17],
          [2, wave, 17],
        ]);
        const { scaleAt, blendLight, angle } = waves[0].opts as { scaleAt: (t: number) => number; blendLight: (t: number) => number; angle: number[] };
        expect([0, 1, 2].map(n => scaleAt(n / 25))).toEqual([1, 1.24, 1.24 ** 2]);
        expect(blendLight(2 / 25)).toBeCloseTo(15 * 0.45 ** 2);
        // Light[0] under 0.001 is zeroed.
        expect(blendLight(16 / 25)).toBe(0);
        expect(angle[2]).toBeCloseTo(0.5 * (180 / Math.PI));
      }
    }
  });
});

describe('Increase Block\'s MODEL_WINDFOCE sub1: a pillar on the body while it holds an Ourforces buff (WSclient.cpp:5072-5081, MoveHandlers.cpp:9556-9575)', () => {
  const ATT = PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES;
  const lasting = (r: Run): Spawn[] => r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.windForce && s.opts.seconds === Infinity);

  it('Increase Block and its master skills raise it on the caster: Scale 1, Light (0.6, 0.6, 1) x a breath, drawn x 6, turning -WorldTime x 0.3 degrees', () => {
    for (const skill of [268, 569, 572]) {
      const [pillar, ...more] = lasting(run(skill, ATT, { buffs: new Set([131]), ticks: 2 }));
      expect(more).toEqual([]);
      expect([pillar.tick, pillar.at.x, pillar.at.z]).toEqual([0, 100, 100]);
      const { scale, colour, blendLight, blendClamp, spin } = pillar.opts as { scale?: number; colour: number[]; blendLight: (t: number) => number; blendClamp: boolean; spin: number };
      expect([scale ?? 1, colour, blendClamp]).toEqual([1, [0.6, 0.6, 1], true]);
      // (sin(WorldTime x 0.001) + 1) x 0.25 + 0.2, WorldTime in ms.
      expect(blendLight(0)).toBeCloseTo(6 * ((Math.sin(fxNow()) + 1) * 0.25 + 0.2));
      expect(spin).toBeCloseTo((300 * Math.PI) / 180);
    }
    for (const skill of [266, 267, 573]) expect(lasting(run(skill, ATT, { buffs: new Set([131]), ticks: 2 }))).toEqual([]);
  });

  it('stands while the body holds any Ourforces buff and goes with the last (LifeTime kept at 10, then 0)', () => {
    const buffs = new Set([131, 130]);
    const drop = (tick: number): void => {
      if (tick === 30) buffs.delete(131);
      if (tick === 50) buffs.delete(130);
    };
    const [pillar] = lasting(run(268, ATT, { buffs, ticks: 60, onTick: drop }));
    expect(pillar.end).toBe(50);
  });

  it('stands 25 ticks for the buff, which comes in its own packet, and goes without it (the original registers it at once, WSclient.cpp:5089-5102)', () => {
    const [pillar] = lasting(run(268, ATT, { buffs: new Set(), ticks: 40 }));
    expect(pillar.end).toBe(25);
  });

  it('one a body: a new cast takes the old one\'s place (DeleteEffect, WSclient.cpp:5080-5081)', () => {
    const recast = (tick: number, caster: Entity): void => void (tick === 10 && playTargetedSkillVisual(scene, 268, caster, null));
    const pillars = lasting(run(268, ATT, { buffs: new Set([131]), ticks: 20, onTick: recast }));
    expect(pillars.map(p => [p.tick, p.end])).toEqual([
      [0, 10],
      [10, undefined],
    ]);
  });

  it('on the hero\'s target when the hero casts, on the caster when another does (_pObj, WSclient.cpp:5060-5064)', () => {
    const at = (hero: boolean): number[] => {
      const [pillar] = lasting(run(268, ATT, { hero, buffs: new Set([131]), ticks: 1 }));
      return [pillar.at.x, pillar.at.z];
    };
    expect(at(true)).toEqual([103, 104]);
    expect(at(false)).toEqual([100, 100]);
  });
});

describe('Dark Side (263)', () => {
  const READY = PlayerAction.PLAYER_SKILL_DARKSIDE_READY;

  it('another caster\'s draws no afterimage, burst or dark wave: the CMonkSystem DarksideRendering reads is the hero\'s (MonkSystem.cpp:697-857)', () => {
    for (const skill of [263, 559]) {
      const r = run(skill, READY, { keysPerTick: 0.3 });
      expect(r.spawns.filter(s => s.name === 'afterimage')).toEqual([]);
      expect(drawTicks(r, TEX.damage2)).toEqual([]);
      expect(spriteTicks(r, TEX.damage2)).toEqual([]);
      expect(r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwave)).toEqual([]);
    }
  });

  /**
   * The hero's cast, echoed at the end of tick 0 with targets 6 (4 tiles ahead) and 7 (3 tiles aside) already named, at READY's
   * 0.3 keys a tick: the follow-ups go on ticks 8 and 15. The afterimage copies are stand-ins that record where each part is put;
   * the body draws five parts (no helm: the head in its place), so five DarksideRendering calls a tick. `look` dresses the hero:
   * a helm item, a skin (a changed body) or the map.
   */
  function heroDarkSide(ticks = 30, look: { helm?: { group: number; num: number }; skin?: number; map?: ENUM_WORLD } = {}) {
    let tick = 0;
    const parts = Object.fromEntries(['Boots', 'Gloves', 'Pants', 'Armor', 'HelmMask', 'Helm'].map(k => [k, { part: k }]));
    const model = { ...parts, CurrentAction: READY as number, AnimationSpeed: 0.3, actionFrame: () => tick * 0.3 };
    const hero = {
      netId: 1,
      localPlayer: true,
      skin: look.skin,
      charAppearance: { helm: look.helm ?? null },
      transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(), scale: 1 },
      modelObject: model,
    } as unknown as Entity;
    const others: Record<number, Entity> = {
      6: { netId: 6, transform: { pos: new Vector3(100, 0, 104), rot: new Vector3(), scale: 1 } } as unknown as Entity,
      7: { netId: 7, transform: { pos: new Vector3(103, 0, 100), rot: new Vector3(), scale: 1 } } as unknown as Entity,
    };
    store.world = { scene, playerEntity: hero, getByNetId: (id: number) => others[id], mapIndex: look.map ?? ENUM_WORLD.WD_0LORENCIA, getTerrainHeight: () => 0 };
    const copies: { tick: number; placed: { tick: number; part: number; at: Vector3; angle: number; alpha: number }[] }[] = [];
    const spawns: Spawn[] = [];
    const draws: Draw[] = [];
    const real = effects.spawn.bind(effects);
    effects.reset();
    const spy = vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: Scene, at: Vector3, opts: never) => {
      spawns.push({ tick, name, at: at.clone(), opts: (opts ?? {}) as Record<string, unknown> });
      if (name === 'afterimage') {
        const copy = { tick, placed: [] as (typeof copies)[number]['placed'] };
        copies.push(copy);
        const n = (opts as unknown as { parts: unknown[] }).parts.length;
        return { alive: true, parts: n, stop() {}, hide() {}, place: (part: number, p: Vector3, angle: number, alpha: number) => copy.placed.push({ tick, part, at: p.clone(), angle, alpha }) };
      }
      if (name === 'ticked') {
        const script = opts as unknown as { tick: (fx: TickedFx, n: number) => boolean };
        const wrap = (fx: TickedFx): TickedFx => ({ ...fx, sprite: (...a: Parameters<TickedFx['sprite']>) => (draws.push({ tick, kind: 'sprite', args: a }), fx.sprite(...a)) });
        return real(name, s, at, { tick: (fx: TickedFx, n: number) => script.tick(wrap(fx), n) } as never);
      }
      return real(name, s, at, opts);
    }) as never);
    beginDarkSide(263, 0);
    observeDarkSideTargets(263, [6, 7]);
    observeDarkSideEcho(263, hero);
    playTargetedSkillVisual(scene, 263, hero, null);
    for (tick = 1; tick <= ticks; tick++) {
      rageLayer.update?.(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
      effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
    }
    spy.mockRestore();
    rageLayer.reset?.();
    store.world = null;
    return { copies, spawns, draws };
  }

  it('the hero\'s body runs out to each target in turn, five parts a tick, and his afterimages come with the first follow-up (MonkSystem.cpp:711-834)', () => {
    const { copies } = heroDarkSide();
    // Dummies 0 and 1 as READY passes key 2 on tick 8, 2 past key 4 on tick 14; 3 and 4 find no target left and no echo target.
    expect(copies.map(c => c.tick)).toEqual([0, 8, 8, 14]);
    const [runner, first] = copies;
    // Ticks 1-14 five parts each; on tick 15 the second follow-up leaves no target to run at after part 0.
    const perTick = new Map<number, number>();
    for (const p of runner.placed) perTick.set(p.tick, (perTick.get(p.tick) ?? 0) + 1);
    expect([...perTick]).toEqual([...range(1, 14).map(t => [t, 5]), [15, 1]]);
    // f x f x 0.05 cm toward target 6, a part a call, at full alpha.
    expect(runner.placed.slice(0, 5).map(p => +((p.at.z - 100) * 100).toFixed(2))).toEqual([0.05, 0.2, 0.45, 0.8, 1.25]);
    expect(runner.placed.every(p => p.alpha === 1)).toBe(true);
    // The first afterimage runs at target 7 from 150, 150 cm off it, its parts in RenderCharacter's order.
    expect(first.placed.slice(0, 5).map(p => p.part)).toEqual([0, 1, 2, 3, 4]);
    expect(first.placed[0].alpha).toBeCloseTo(0.22, 5);
    expect(Vector3.Distance(first.placed[0].at, new Vector3(104.5, 0, 101.5))).toBeLessThan(0.01);
  });

  it('copies the parts RenderCharacter draws: the head only under an open helm, the Angel alone in Chaos Castle, a changed body\'s one part (ZzzCharacter.cpp:9345-9390, :9536-9654, :12114-12128)', () => {
    const copied = (look: Parameters<typeof heroDarkSide>[1]) =>
      heroDarkSide(1, look).spawns.filter(s => s.name === 'afterimage').map(s => (s.opts.parts as { part: string }[]).map(p => p.part));
    const BODY = ['Boots', 'Gloves', 'Pants', 'Armor'];
    // No helm: BODYPART_HELM is the head; a closed helm hides it (BODYPART_HEAD -1); an open one shows it after the helm.
    expect(copied({})).toEqual([[...BODY, 'Helm']]);
    expect(copied({ helm: { group: 7, num: 1 } })).toEqual([[...BODY, 'HelmMask']]);
    for (const num of [0, 2, 10, 13, 63, 65, 68, 70]) expect(copied({ helm: { group: 7, num } })).toEqual([[...BODY, 'HelmMask', 'Helm']]);
    expect(copied({ helm: { group: 7, num: 14 } })).toEqual([[...BODY, 'HelmMask']]);
    expect(copied({ map: ENUM_WORLD.WD_18CHAOS_CASTLE })).toEqual([['Armor']]);
    // Skeleton, Elite Skull Soldier, Jack O'Lantern, Christmas girl, panda and skeleton rings: the one part file on Armor.
    for (const skin of [14, 372, 373, 374, 503, 548]) expect(copied({ skin })).toEqual([['Armor']]);
    // Any other skin draws plainly, with no DarksideRendering.
    for (const skin of [7, 488]) expect(copied({ skin })).toEqual([]);
  });

  it('a changed body\'s afterimages run 30 times as far a call, as in Chaos Castle (bChange, MonkSystem.cpp:786-792, :1489-1493)', () => {
    const steps = (look: Parameters<typeof heroDarkSide>[1]) => {
      const placed = heroDarkSide(12, look).copies[1].placed.filter(p => p.part === 0);
      return [1, 2].map(i => +(Vector3.Distance(placed[i].at, placed[i - 1].at) * 100).toFixed(2));
    };
    // 0.7 x 0.7 cm more a call: five calls a tick run its calls 2-6 and 7-11 between its first part's draws, 9.8 and 22.05 cm.
    expect(steps({})).toEqual([9.8, 22.05]);
    // One call a tick, its calls 2 and 3: 0.98 and 1.47 cm, x30.
    expect(steps({ skin: 503 })).toEqual([29.4, 44.1]);
    expect(steps({ map: ENUM_WORLD.WD_18CHAOS_CASTLE })).toEqual([29.4, 44.1]);
  });

  it('the bursts on the target the body runs at from the afterimages\' calls 20 and 21, the waves from their calls 31 and 32 and the body\'s past 30 cm (MonkSystem.cpp:736-747, :811-826)', () => {
    const { spawns, draws } = heroDarkSide();
    const waves = spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwave);
    const light = (s: Spawn) => (s.opts.blendLight as (t: number) => number)(0);
    // The body's sub3, drawn twice, on ticks 5 and 13 (its 25th call each time); the first two afterimages' sub4 on tick 14, the third's on 20.
    expect(waves.map(s => [s.tick, light(s)])).toEqual([
      [5, 1],
      [5, 1],
      [13, 1],
      [13, 1],
      [14, 0.2],
      [14, 0.2],
      [14, 0.2],
      [14, 0.2],
      [20, 0.2],
      [20, 0.2],
    ]);
    const n = new Map<number, number>();
    for (const d of draws) if (d.args[0] === TEX.damage2) n.set(d.tick, (n.get(d.tick) ?? 0) + 1);
    // One burst on tick 11, three on tick 12, each drawn 15 ticks; all at target 7.
    expect([...n]).toEqual([[11, 1], ...range(12, 25).map(t => [t, 4]), [26, 3]]);
    expect(draws.filter(d => d.args[0] === TEX.damage2).every(d => d.args[2] === 103 && d.args[4] === 100)).toBe(true);
  });

  it('the body\'s wave backs off from 150 cm on, sub3 then sub5: 180 + Scale x 80 cm up on its first move, then 160 + Scale x 10 (ZzzEffect.cpp:5895-5913, MoveHandlers.cpp:9397-9425)', () => {
    const { spawns } = heroDarkSide();
    const wave = spawns.find(s => s.name === 'model' && s.opts.model === MODEL.shockwave) as Spawn;
    const o = wave.opts as { follow: (out: Vector3) => Vector3; scaleAt: (t: number) => number; angle: number[]; texture: string };
    expect(o.texture).toBe(TEX.damage2);
    // Made 31.25 cm out toward target 6 (ahead, +z), turned its way - 180: (90, 0, 0).
    expect(o.angle).toEqual([90, 0, 0]);
    expect(wave.at.z).toBeCloseTo(100 + 0.3125 + 1.5, 5);
    expect(o.scaleAt(0)).toBeCloseTo(0.8, 6);
    expect(o.scaleAt(1 / 25)).toBeCloseTo(0.92, 6);
    // Light x0.7 turns it sub5 on its first move, then x0.5; it lives 5 / (2 x 0.3) ticks.
    const light = wave.opts.blendLight as (t: number) => number;
    expect([0, 1, 2].map(m => light(m / 25))).toEqual([1, 0.7, 0.35]);
    expect(Math.round((wave.opts.seconds as number) * 25)).toBe(9);
  });

  it('the wind pillar at the caster, and the two it raises on ticks 11 and 21 (MonkSystem.cpp:1297-1298, MoveHandlers.cpp:9579-9596)', () => {
    for (const skill of [263, 559]) {
      const pillars = run(skill, READY, { keysPerTick: 0.3 }).spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.windForce);
      expect(pillars.map(s => [s.tick, s.opts.colour, Math.round((s.opts.seconds as number) * 25)])).toEqual([
        [0, [1, 0.5, 0.2], 70],
        [11, [1, 0.5, 0], 70],
        [21, [1, 0.5, 0], 70],
      ]);
      // Scale 1 + 0.1 a tick up to 3, Light x 6 keeping 0.85 a tick.
      const { scaleAt, blendLight } = pillars[0].opts as { scaleAt: (t: number) => number; blendLight: (t: number) => number };
      expect([0, 5, 20, 40].map(t => scaleAt(t / 25))).toEqual([1, 1.5, 3, 3]);
      expect(blendLight(2 / 25)).toBeCloseTo(6 * 0.85 ** 2);
    }
  });

  it('the ground decals at the caster: BITMAP_EVENT_CLOUD sub1 (1, 0.6, 0.6) growing to 5 and BITMAP_MAGIC sub14 (1, 0.4, 0) drawn twice (MonkSystem.cpp:1289-1294, MoveHandlers.cpp:9497-9506, :1436-1447)', () => {
    for (const skill of [263, 559]) {
      const rings = run(skill, READY, { keysPerTick: 0.3 }).spawns.filter(s => s.name === 'ring');
      expect(rings.map(s => [s.tick, s.opts.texture, s.opts.colour, Math.round((s.opts.seconds as number) * 25)])).toEqual([
        [0, TEX.eventCloud, [1, 0.6, 0.6], 30],
        [0, TEX.magicGround, [1, 0.4, 0], 22],
        [0, TEX.magicGround, [1, 0.4, 0], 22],
      ]);
      // Sub1 grows x1.08 a move up to 5, not 3.
      const cloud = rings[0].opts as { scaleAt: (t: number) => number };
      expect([15, 20, 21, 29].map(n => cloud.scaleAt(n / 25))).toEqual([1.08 ** 15, 1.08 ** 20, 5, 5]);
    }
  });

  it('Rage_Darkside_Att when the server names targets (MonkSystem.cpp:551-558)', () => {
    played.length = 0;
    beginDarkSide(263, 5);
    observeDarkSideTargets(263, []);
    expect(played).toEqual([]);
    observeDarkSideTargets(263, [6, 7, 8]);
    expect(played).toEqual(['Sound/Ragefighter/Rage_Darkside_Att']);
    rageLayer.reset?.();
  });

  /**
   * The ticks a follow-up goes out on: the server's echo of the cast comes at the end of each tick in `echoes`, its
   * targets at the end of tick `targetsAt` (0: before the echo) and the hero leaves the Dark Side clip on `leaveAt`.
   */
  function followUps(echoes: readonly number[], { skill = 263, targetsAt = 0, leaveAt = Infinity } = {}): number[] {
    const model = { CurrentAction: READY as number, AnimationSpeed: 0.3 };
    const hero = { localPlayer: true, modelObject: model } as unknown as Entity;
    store.world = { playerEntity: hero };
    const targets = () => observeDarkSideTargets(skill, [6, 7, 8]);
    beginDarkSide(skill, 5);
    if (targetsAt === 0) targets();
    if (echoes.includes(0)) observeDarkSideEcho(skill, hero);
    const sent: number[] = [];
    for (let t = 1; t <= 40; t++) {
      if (t >= leaveAt) model.CurrentAction = PlayerAction.PLAYER_STOP_MALE;
      const gone = darkSideCast.sent;
      rageLayer.update?.(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
      if (darkSideCast.sent > gone) sent.push(t);
      if (echoes.includes(t)) observeDarkSideEcho(skill, hero);
      if (t === targetsAt) targets();
    }
    rageLayer.reset?.();
    store.world = null;
    return sent;
  }

  it('follow-ups on (int)(2.5 / PlaySpeed): 8 ticks after the echo at 0.3, then every 7 (SkillCast.cpp:1117-1129)', () => {
    expect(darkSideHitTicks(0.3)).toBe(8);
    expect(darkSideHitTicks(0.5)).toBe(5);
    expect(followUps([0])).toEqual([8, 15, 22]);
  });

  it('keeps the targets named and the follow-ups gone for DarksideRendering; past the fifth, the next one due drops them (MonkSystem.cpp:591-595, :615-639)', () => {
    const model = { CurrentAction: READY as number, AnimationSpeed: 0.3 };
    const hero = { localPlayer: true, modelObject: model } as unknown as Entity;
    store.world = { playerEntity: hero };
    beginDarkSide(263, 5);
    observeDarkSideTargets(263, [6, 7, 8, 9, 10]);
    expect(darkSideCast.targets).toEqual([6, 7, 8, 9, 10]);
    const named = darkSideCast.serial;
    observeDarkSideEcho(263, hero);
    const seen: [number, number][] = [];
    for (let t = 1; t <= 45; t++) {
      rageLayer.update?.(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
      if (seen.at(-1)?.[1] !== darkSideCast.sent) seen.push([t, darkSideCast.sent]);
    }
    expect(seen).toEqual([
      [1, 0],
      [8, 1],
      [15, 2],
      [22, 3],
      [29, 4],
      [36, 5],
      [43, 0],
    ]);
    expect(darkSideCast.targets).toEqual([]);
    expect(darkSideCast.serial).toBe(named + 1);
    rageLayer.reset?.();
    store.world = null;
  });

  it('Dark Side Strengthener (559) is Dark Side too: the 0x4B/0x4A pair and its follow-ups (SkillCast.cpp:881-896)', () => {
    expect(isDarkSide(559)).toBe(true);
    expect(followUps([0], { skill: 559 })).toEqual([8, 15, 22]);
  });

  it('stop when the hero leaves the Dark Side clip (SkillCast.cpp:1117)', () => {
    expect(followUps([0], { leaveAt: 16 })).toEqual([8, 15]);
    expect(followUps([0], { leaveAt: 8 })).toEqual([]);
  });

  it('none once AttackTime reaches 15 before the targets come (ZzzCharacter.cpp:4139-4141)', () => {
    expect(followUps([0], { targetsAt: 13 })).toEqual([14, 21, 28]);
    expect(followUps([0], { targetsAt: 14 })).toEqual([]);
  });

  it('count from the server\'s echo of the cast, not the cast (AttackTime = 1, WSclient.cpp:13422-13429)', () => {
    expect(followUps([])).toEqual([]);
    expect(followUps([5])).toEqual([13, 20, 27]);
  });

  it('a later echo does not restart the count', () => {
    expect(followUps([0, 10])).toEqual([8, 15, 22]);
  });
});

describe('The Ourforces buff looks: BITMAP_LIGHT_RED on the buffed body, by sub (WSclient.cpp:15662-15679, MoveHandlers.cpp:9613-9672, ZzzEffect.cpp:9563-9640)', () => {
  /**
   * The aura options a buff look gives, and what it spawns and draws over `ticks` ticks on a body that keeps `effect` and `others`;
   * `onTick` may change the body's buffs before each tick.
   */
  function look(effect: number, ticks = 40, others: number[] = [], onTick?: (tick: number, buffs: Set<number>, body: Entity) => void): { aura: Record<string, unknown>; spawns: Spawn[]; draws: Draw[] } {
    const buffs = new Set([effect, ...others]);
    const body = { netId: 3, transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0.5, 0), scale: 1 }, buffs } as unknown as Entity;
    effects.reset();
    let tick = 0;
    const spawns: Spawn[] = [];
    const draws: Draw[] = [];
    const real = effects.spawn.bind(effects);
    const spy = vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: Scene, at: Vector3, opts: never) => {
      spawns.push({ tick, name, at: at.clone(), opts: (opts ?? {}) as Record<string, unknown> });
      if (name !== 'ticked') return real(name, s, at, opts);
      const script = opts as unknown as { tick: (fx: TickedFx, n: number) => boolean };
      return real(name, s, at, {
        tick: (fx: TickedFx, n: number) =>
          script.tick({ ...fx, scene: fx.scene, strip: o => fx.strip(o), drop: st => fx.drop(st), ribbon: o => fx.ribbon(o), decal: (...a) => fx.decal(...a), sprite: (...a) => (draws.push({ tick, kind: 'sprite', args: a }), fx.sprite(...a)) }, n),
      } as never);
    }) as never);
    setBuffVisual(scene, body, effect, true);
    for (tick = 1; tick <= ticks; tick++) {
      onTick?.(tick, buffs, body);
      effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
    }
    spy.mockRestore();
    clearBuffVisuals(body);
    const aura = spawns.find(s => s.name === 'aura')?.opts ?? {};
    return { aura, spawns, draws };
  }

  it('Increase Health (130, 155): sub0, the 17-bone glow and two flare01_red decals 3.5 across under the body, breathing 0.2-0.7 (ZzzEffect.cpp:9563-9583)', () => {
    for (const effect of [130, 155]) {
      const { aura } = look(effect, 1);
      const ground = aura.groundGlow as { texture: string; size: number; count: number; breathe: (t: number) => number };
      expect(aura.boneGlow).toBeDefined();
      expect([ground.texture, ground.size, ground.count]).toEqual([TEX.flareRed, 3.5, 2]);
      const levels = range(0, 100).map(i => ground.breathe(i * 0.5));
      expect([Math.min(...levels), Math.max(...levels)]).toEqual([expect.closeTo(0.2, 2), expect.closeTo(0.7, 2)]);
    }
  });

  it('Ignore Defense (129): sub1, no glow; each tick a red SMOKELINE1 sub5 from bone 26 or 35, drawn 30 ticks (MoveHandlers.cpp:9659-9672, ZzzEffectParticle.cpp:1767-1786, :5963-5990)', () => {
    for (const effect of [129]) {
      const { aura, draws } = look(effect);
      expect(aura.boneGlow).toBeUndefined();
      const smokes = draws.filter(d => d.args[0] === TEX.smokeLine1);
      // One a tick from tick 1, each on its moves 1-30: its Alpha is 0.7 until LifeTime 10, then 0.1 less a move.
      expect([1, 2, 30, 31, 40].map(t => smokes.filter(d => d.tick === t).length)).toEqual([1, 2, 30, 30, 30]);
      expect(smokes[0].args[1]).toEqual([1, 0.12, 0]);
      // No skeleton here: bone 26 is the feet + 90 cm.
      expect(smokes[0].args[3]).toBeGreaterThan(0.9);
    }
  });

  it('each BITMAP_LIGHT_RED on an Ignore Defense body makes a smoke: one for each Ourforces buff it holds (MoveHandlers.cpp:9659-9672)', () => {
    const made = (others: number[]): number[] => {
      const smokes = look(129, 3, others).draws.filter(d => d.args[0] === TEX.smokeLine1);
      return [1, 2, 3].map(t => smokes.filter(d => d.tick === t).length);
    };
    expect(made([130])).toEqual([2, 4, 6]);
    expect(made([155, 131])).toEqual([3, 6, 9]);
    // A master buff counts as its base, not on its own.
    expect(made([130, 155])).toEqual([2, 4, 6]);
  });

  it('none while the body is cloaked, and again once it is not (MoveHandlers.cpp:9657-9658)', () => {
    const cloak = (tick: number, buffs: Set<number>): void => void (tick === 3 ? buffs.add(18) : tick === 40 ? buffs.delete(18) : undefined);
    const smokes = look(129, 42, [], cloak).draws.filter(d => d.args[0] === TEX.smokeLine1);
    // The two made on ticks 1 and 2 are drawn to ticks 30 and 31; none more until tick 40.
    expect([2, 30, 31, 32, 39, 40, 41].map(t => smokes.filter(d => d.tick === t).length)).toEqual([2, 2, 1, 0, 0, 1, 2]);
  });

  it('Increase Block (131, 153, 154): sub2, no glow; one tick in 70 a MODEL_WINDFOCE_MIRROR while none is up (MoveHandlers.cpp:9624-9636, :9675-9692)', () => {
    // rand() % 70 == 7 every tick: one mirror, then none while it lives.
    const random = vi.spyOn(Math, 'random').mockReturnValue(7.5 / 70);
    const { aura, spawns } = look(131);
    random.mockRestore();
    expect(aura.boneGlow).toBeUndefined();
    const mirrors = spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.windForceMirror);
    expect(mirrors.map(s => s.tick)).toEqual([1]);
    const { seconds, colour, spin, scaleAt, blendLight } = mirrors[0].opts as { seconds: number; colour: number[]; spin: number; scaleAt: (t: number) => number; blendLight: (t: number) => number };
    // LifeTime 50; Light (0.6, 0.6, 1) x 6, keeping 0.9 a tick; Scale x1.015 a tick to 1.5; turning WorldTime x 0.4 degrees.
    expect([Math.round(seconds * 25), colour, scaleAt(2 / 25), scaleAt(40 / 25), blendLight(2 / 25)]).toEqual([50, [0.6, 0.6, 1], expect.closeTo(1.015 ** 2), 1.5, expect.closeTo(6 * 0.81)]);
    expect(spin).toBeCloseTo((-400 * Math.PI) / 180);
    for (const effect of [153, 154]) expect(look(effect, 1).aura.pulse).toBeDefined();
  });

  it('each BITMAP_LIGHT_RED on an Increase Block body rolls for the mirror (MoveHandlers.cpp:9617-9636)', () => {
    // Only the third roll comes up 7: tick 1 with three of them, tick 3 with one.
    const mirrorTick = (others: number[]): number[] => {
      let n = 0;
      const random = vi.spyOn(Math, 'random').mockImplementation(() => (++n === 3 ? 7.5 / 70 : 0));
      const { spawns } = look(131, 5, others);
      random.mockRestore();
      return spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.windForceMirror).map(s => s.tick);
    };
    expect(mirrorTick([129, 130])).toEqual([1]);
    expect(mirrorTick([])).toEqual([3]);
  });

  it('the mirror goes with Increase Block, or with the body (MoveHandlers.cpp:9682-9688)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(7.5 / 70);
    let held = new Set<number>();
    let body: { objOutOfScope?: boolean } = {};
    const { spawns } = look(131, 2, [130], (_t, buffs, e) => {
      held = buffs;
      body = e as { objOutOfScope?: boolean };
    });
    random.mockRestore();
    const until = spawns.find(s => s.name === 'model' && s.opts.model === MODEL.windForceMirror)?.opts.until as () => boolean;
    expect(until()).toBe(false);
    // Increase Health keeps its BITMAP_LIGHT_RED, not the mirror.
    held.delete(131);
    expect(until()).toBe(true);
    held.add(131);
    body.objOutOfScope = true;
    expect(until()).toBe(true);
  });
});
