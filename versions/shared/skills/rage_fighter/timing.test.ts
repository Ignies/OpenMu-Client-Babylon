import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { TEX } from '@/controllers/fx/recipes';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { PlayerAction } from '../../objects/enum';
import { playAreaSkillVisual, playTargetedSkillVisual } from '../skillVisuals';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

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
  opts: Record<string, unknown>;
}
interface Run {
  spawns: Spawn[];
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
  const out: Run = { spawns: [], sounds: [] };
  const real = effects.spawn.bind(effects);
  const spy = vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: Scene, at: Vector3, opts: never) => {
    out.spawns.push({ tick, name, opts: (opts ?? {}) as Record<string, unknown> });
    return real(name, s, at, opts);
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
});
