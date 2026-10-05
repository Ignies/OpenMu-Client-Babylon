import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import type { TailStrip, TickedFx } from '@/controllers/fx/ticked';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { PlayerAction } from '../../objects/enum';
import { playAreaSkillVisual, playTargetedSkillVisual } from '../skillVisuals';
import { skillSound } from '@/controllers/sound/combat';
import { beginDarkSide, darkSideHitTicks, isDarkSide, nextDarkSideHit, observeDarkSideEcho, observeDarkSideTargets, rageLayer } from './dark_side/rage';

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
  { keysPerTick = 0.4, ticks = 60, area = false, hero = false, leaveAt = 0, target = true }: { keysPerTick?: number; ticks?: number; area?: boolean; hero?: boolean; leaveAt?: number; target?: boolean } = {}
): Run {
  let tick = 0;
  const model = { CurrentAction: clip as number, actionFrame: () => 0, AnimationSpeed: keysPerTick };
  model.actionFrame = () => (model.CurrentAction === clip ? tick * keysPerTick : 0);
  const caster = {
    netId: 1,
    localPlayer: hero || undefined,
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
const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('Dragon Slasher (265): MODEL_DRAGON_KICK_DUMMY reads the caster\'s DRAGONKICK clip (MoveHandlers.cpp:9826-9915)', () => {
  const KICK = PlayerAction.PLAYER_SKILL_DRAGONKICK;
  const ATT = 'Sound/Ragefighter/Rage_Dragonkick_Att';

  it('bursts on the target every tick past key 5, and Rage_Dragonkick_Att every tick past key 8', () => {
    // Key 5.2 on tick 13, 8.4 on tick 21; the clip is left on tick 26.
    const r = run(265, KICK, { leaveAt: 26, ticks: 40 });
    expect(spriteTicks(r, TEX.spark2)).toEqual(range(13, 25));
    expect(soundTicks(r, ATT)).toEqual(range(21, 25));
  });

  it('drops everything when the caster leaves the clip first', () => {
    const r = run(265, KICK, { leaveAt: 10, ticks: 40 });
    expect(spriteTicks(r, TEX.spark2)).toEqual([]);
    expect(soundTicks(r, ATT)).toEqual([]);
  });

  it('draws nothing on the target without one (m_sTargetIndex < 0)', () => {
    const r = run(265, KICK, { leaveAt: 26, ticks: 40, target: false });
    expect(spriteTicks(r, TEX.spark2)).toEqual([]);
    expect(soundTicks(r, ATT)).toEqual([]);
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

  /** The ticks a one-tick sprite of `texture` was drawn on, and how many were drawn on each. */
  const drawTicks = (r: Run, texture: string): [number, number][] => {
    const n = new Map<number, number>();
    for (const d of r.draws) if (d.kind === 'sprite' && d.args[0] === texture) n.set(d.tick, (n.get(d.tick) ?? 0) + 1);
    return [...n.entries()];
  };

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

describe('Dragon Roar (264): the dragon on BLOW_OF_DESTRUCTION\'s LifeTime, the fire ring on DRAGONLORE key 5', () => {
  const LORE = PlayerAction.PLAYER_SKILL_DRAGONLORE;
  const dragon = (r: Run) => r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.dragonHead).map(s => s.tick);
  const ring = (r: Run) => r.spawns.filter(s => s.name === 'ring' && s.opts.texture === TEX.shockwave).map(s => s.tick);

  it('the dragon on tick 21 (LifeTime 50 reaches 30, MoveHandlers.cpp:7650-7666), the ring past key 5 (tick 17 at 0.3 a tick)', () => {
    for (const skill of [264, 560]) {
      const r = run(skill, LORE, { keysPerTick: 0.3, area: true });
      expect(dragon(r)).toEqual([21]);
      expect(ring(r)).toEqual([17]);
    }
  });

  it('no ring when the clip is left before key 5; the dragon comes anyway', () => {
    const r = run(264, LORE, { keysPerTick: 0.3, area: true, leaveAt: 15 });
    expect(dragon(r)).toEqual([21]);
    expect(ring(r)).toEqual([]);
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

  it('another caster: Rage_Stamp at the packet, the two blows 5 and 17 ticks later at 0.4 a tick', () => {
    for (const skill of [261, 552, 555]) {
      const r = run(skill, STAMP);
      expect(soundTicks(r, CAST)).toEqual([0]);
      expect(spriteTicks(r, TEX.spark2)).toEqual([5, 17]);
      expect(soundTicks(r, ATT)).toEqual([5, 17]);
    }
  });

  it('follows the STAMP PlaySpeed: 0.45 a tick hits 5 and 15 ticks later', () => {
    // v = 0.9: R reaches key 3 on move 5 and key 6 on move 8; L reaches key 5 on its move 7.
    expect(spriteTicks(run(261, STAMP, { keysPerTick: 0.45 }), TEX.spark2)).toEqual([5, 15]);
  });

  it('the hero: the effect waits for STAMP key 2 (SkillCast.cpp:1111-1115), tick 5 at 0.45 a tick', () => {
    const r = run(261, STAMP, { hero: true, keysPerTick: 0.45 });
    expect(soundTicks(r, CAST)).toEqual([5]);
    expect(spriteTicks(r, TEX.spark2)).toEqual([10, 20]);
  });

  it('the hero: nothing if the clip is left before key 2', () => {
    const r = run(261, STAMP, { hero: true, leaveAt: 3 });
    expect(soundTicks(r, CAST)).toEqual([]);
    expect(spriteTicks(r, TEX.spark2)).toEqual([]);
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
  const sprays = (r: Run) => [...new Set(r.spawns.filter(s => s.name === 'joint').map(s => s.tick))];
  const force = (r: Run) => r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.swordForce).map(s => s.tick);
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
        const pillars = run(skill, PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES).spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.windForce);
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

describe('Dark Side (263)', () => {
  const READY = PlayerAction.PLAYER_SKILL_DARKSIDE_READY;

  it('per blow: the bursts on ticks 20-21 and the dark wave on 30-31, a 25 Hz tick standing for a rendered frame (MonkSystem.cpp:811-826)', () => {
    for (const skill of [263, 559]) {
      const r = run(skill, READY, { keysPerTick: 0.3 });
      expect(spriteTicks(r, TEX.damage2)).toEqual([20, 21]);
      expect(r.spawns.filter(s => s.name === 'model' && s.opts.model === MODEL.shockwave).map(s => s.tick)).toEqual([30, 31]);
    }
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
      rageLayer.update?.(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
      if (nextDarkSideHit() >= 0) sent.push(t);
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
