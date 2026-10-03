import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { ENUM_WORLD } from '@/core/types';
import { playerPlaySpeed } from '@/controllers/anim/playSpeed';
import type { Entity } from '@/ecs/world';
import { PlayerAction } from '../objects/enum';
import { playTargetedSkillVisual } from './skillVisuals';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/**
 * When a cast lands, against the caster's magic speed: AttackTime runs 14 ticks from the packet, but
 * AttackStage releases as soon as the caster's clip reaches key 5 (ZzzCharacter.cpp:2590-2604, :3052-3060,
 * :4132-4140). Fire Ball (4) from a wizard's PLAYER_SKILL_HAND1, played at 25 fps.
 */
const FIRE_BALL = 4;
const CLIP = PlayerAction.PLAYER_SKILL_HAND1;
/** Force (60) from the Dark Lord's strike clip: AttackStage releases it at key 3 (ZzzCharacter.cpp:2865-2873). */
const FORCE = 60;
const STRIKE = PlayerAction.PLAYER_ATTACK_STRIKE;

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

/**
 * Frames after the packet at which the caster's clip reaches `key`, and at which the skill first spawns.
 * `keysPerTick` is the clip's PlaySpeed; the game runs at `fps`.
 */
function timeline(skill: number, clip: PlayerAction, keysPerTick: number, key: number, fps = 25): { key: number; release: number } {
  let frame = 0;
  const model = { CurrentAction: clip, actionFrame: () => frame };
  const caster = {
    netId: 1,
    transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0.5, 0), scale: 1 },
    playerAnimation: { action: clip },
    modelObject: model,
  } as unknown as Entity;
  const target = { netId: 2, transform: { pos: new Vector3(103, 0, 104), rot: new Vector3(), scale: 1 } } as unknown as Entity;

  effects.reset();
  const spawn = vi.spyOn(effects, 'spawn');
  spawn.mockClear();
  playTargetedSkillVisual(scene, skill, caster, target);
  let keyAt = 0;
  let release = 0;
  for (let f = 1; f <= 100 && !(keyAt && release); f++) {
    frame += (keysPerTick * 25) / fps;
    if (!keyAt && frame >= key) keyAt = f;
    effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / fps);
    if (!release && spawn.mock.calls.length > 0) release = f;
  }
  spawn.mockRestore();
  return { key: keyAt, release };
}

describe('a spell lands with its clip', () => {
  const at = (magicSpeed: number) => timeline(FIRE_BALL, CLIP, playerPlaySpeed(CLIP, 0, magicSpeed), 5);

  it('waits out AttackTime at a low magic speed: the clip is slower than 14 ticks', () => {
    expect(at(0)).toEqual({ key: 18, release: 14 });
  });

  it('leaves on key 5 at a high magic speed, with the clip', () => {
    expect(at(1400)).toEqual({ key: 2, release: 2 });
  });
});

describe('a Dark Lord strike lands on key 3 of its clip', () => {
  const at = (attackSpeed: number, fps = 25) => timeline(FORCE, STRIKE, playerPlaySpeed(STRIKE, attackSpeed), 3, fps);

  it('on the key at a low and a high attack speed', () => {
    expect(at(0)).toEqual({ key: 12, release: 12 });
    expect(at(600)).toEqual({ key: 3, release: 3 });
  });

  it('on the first frame past the key at 60 fps', () => {
    expect(at(0, 60)).toEqual({ key: 29, release: 29 });
  });

  it('14 ticks after the packet when the clip never gets there, at any frame rate', () => {
    // 0.56 s: frame 14 at 25 fps, 34 at 60 fps (polling a tick at a time drifted to frame 42).
    expect(timeline(FORCE, PlayerAction.PLAYER_STOP_MALE, 0.25, 3).release).toBe(14);
    expect(timeline(FORCE, PlayerAction.PLAYER_STOP_MALE, 0.25, 3, 60).release).toBe(34);
  });
});
