import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PlayerAction } from '@versions/shared/objects/enum';
import { ENUM_WORLD } from '@/core/types';
import type { Entity, World } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const playSfx = vi.fn((..._args: unknown[]) => 1000);
vi.mock('@/controllers/sound/sfx', () => ({ playSfx: (...args: unknown[]) => playSfx(...args) }));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
const { playTargetedSkillVisual } = await import('@versions/shared/skills/skillVisuals');
const { effects } = await import('@/controllers/fx');
const { playKillEnergy } = await import('./net');

const FIRE_BALL = 4;

/**
 * The ATTACK_DIE energy orbs are created in the hero's release block (ZzzCharacter.cpp:5242-5247) and the
 * 1-channel SOUND_GET_ENERGY plays when they reach the hero: 22 ticks plus 3.5 a tile of flight.
 */
describe('the kill energy sound', () => {
  let engine: NullEngine;
  let scene: Scene;
  beforeAll(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });
  afterAll(() => {
    scene.dispose();
    engine.dispose();
  });

  /** Tick of the energy sound after the hero's cast of `skill` (0: a plain blow, no cast) and a kill `killAt` ticks later. */
  function soundTick(skill: number, killAt: number): number {
    // A wizard's PLAYER_SKILL_HAND1 at magic speed 0 reaches key 5 only at tick 18: the release waits the 14 ticks out.
    const hero = {
      localPlayer: true,
      netId: 1,
      transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(), scale: 1 },
      playerAnimation: { action: PlayerAction.PLAYER_SKILL_HAND1 },
      modelObject: { CurrentAction: PlayerAction.PLAYER_SKILL_HAND1, actionFrame: () => 0 },
    } as unknown as Entity;
    const victim = { netId: 2, transform: { pos: new Vector3(102, 0, 100), rot: new Vector3(), scale: 1 } } as unknown as Entity;
    const world = { playerEntity: hero, scene } as unknown as World;

    effects.reset();
    playSfx.mockClear();
    if (skill) playTargetedSkillVisual(scene, skill, hero, victim);
    for (let tick = 1; tick <= 80; tick++) {
      effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
      if (tick === killAt) playKillEnergy(world, victim, skill);
      if (playSfx.mock.calls.some(c => c[0] === 'Sound/pEnergy')) return tick;
    }
    return -1;
  }

  it("waits for the hero's cast to release: 14 ticks, then 29 of flight over 2 tiles", () => {
    expect(soundTick(FIRE_BALL, 2)).toBe(14 + 29);
  });

  it('starts at the kill after a plain blow, whose request went out on its release', () => {
    expect(soundTick(0, 2)).toBe(2 + 29);
  });
});
