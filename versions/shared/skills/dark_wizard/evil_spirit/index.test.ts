import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { playAreaSkillVisual } from '../../skillVisuals';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
const spawned: string[] = [];
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  const spawn = effects.spawn.bind(effects);
  vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: never, at: never, opts: never) => {
    spawned.push(name);
    return spawn(name, s, at, opts);
  }) as never);
});
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

// AT_SKILL_EVIL_SPIRIT: four JOINT_SPIRIT pairs and the sound, nothing else (ZzzCharacter.cpp:4584-4604).
describe('Evil Spirit', () => {
  it('draws its spirits with no smoke trail and no screen shroud', () => {
    const caster = { netId: 1, transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0, 0), scale: 1 } } as unknown as Entity;
    for (const id of [9, 385, 487]) {
      spawned.length = 0;
      playAreaSkillVisual(scene, id, caster, null, () => 0, null);
      for (let i = 0; i < 10; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
      expect(spawned).toContain('spiritSwarm');
      expect(spawned).not.toContain('shroud');
      expect(spawned).not.toContain('particles');
    }
  });
});
