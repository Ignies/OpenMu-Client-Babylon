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

describe('a spell lands with its clip', () => {
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

  /** Ticks after the packet at which the clip reaches key 5, and at which the ball leaves. */
  function timeline(magicSpeed: number): { key: number; release: number } {
    const speed = playerPlaySpeed(CLIP, 0, magicSpeed);
    let frame = 0;
    const model = { CurrentAction: CLIP, actionFrame: () => frame };
    const caster = {
      netId: 1,
      transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0.5, 0), scale: 1 },
      playerAnimation: { action: CLIP },
      modelObject: model,
    } as unknown as Entity;
    const target = { netId: 2, transform: { pos: new Vector3(103, 0, 104), rot: new Vector3(), scale: 1 } } as unknown as Entity;

    effects.reset();
    const spawn = vi.spyOn(effects, 'spawn');
    spawn.mockClear();
    playTargetedSkillVisual(scene, FIRE_BALL, caster, target);
    let key = 0;
    let release = 0;
    for (let tick = 1; tick <= 20 && !(key && release); tick++) {
      frame += speed;
      if (!key && frame >= 5) key = tick;
      effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
      if (!release && spawn.mock.calls.length > 0) release = tick;
    }
    spawn.mockRestore();
    return { key, release };
  }

  it('waits out AttackTime at a low magic speed: the clip is slower than 14 ticks', () => {
    expect(timeline(0)).toEqual({ key: 18, release: 14 });
  });

  it('leaves on key 5 at a high magic speed, with the clip', () => {
    expect(timeline(1400)).toEqual({ key: 2, release: 2 });
  });
});
