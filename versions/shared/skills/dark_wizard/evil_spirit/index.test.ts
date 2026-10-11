import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import type { JointOptions } from '@/controllers/fx/joint';
import { MODEL } from '@/controllers/fx/recipes';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { playAreaSkillVisual } from '../../skillVisuals';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
const spawned: [string, Record<string, unknown>][] = [];
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  const spawn = effects.spawn.bind(effects);
  vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: never, at: never, opts: never) => {
    spawned.push([name, opts]);
    return spawn(name, s, at, opts);
  }) as never);
});
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

const rad = (d: number) => (d * Math.PI) / 180;

// AT_SKILL_EVIL_SPIRIT: four JOINT_SPIRIT sub0 pairs (widths 80 and 20) homing on the caster, a
// MODEL_LASER on each wide one, and the sound (ZzzCharacter.cpp:4584-4604, ZzzEffectJoint.cpp:649-658, :3745-3830).
describe('Evil Spirit', () => {
  it('flies four joint pairs homing on the caster, each wide one carrying its skull', () => {
    const caster = { netId: 1, transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0, 0), scale: 1 } } as unknown as Entity;
    for (const id of [9, 385, 487]) {
      spawned.length = 0;
      playAreaSkillVisual(scene, id, caster, null, () => 0, null);
      for (let i = 0; i < 10; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);

      const joints = spawned.filter(([name]) => name === 'joint').map(([, o]) => o as JointOptions);
      expect(joints.map(j => j.width).sort()).toEqual([0.2, 0.2, 0.2, 0.2, 0.8, 0.8, 0.8, 0.8]);
      for (const j of joints) {
        expect([j.velocity, j.maxTails, j.seconds, j.blend, j.steer?.seekRate]).toEqual([17.5, 6, 49 * 0.04, 'subtract', rad(10)]);
        // MoveHumming toward the caster + 80z.
        expect(j.steer?.seek?.(new Vector3()).asArray()).toEqual([100, 0.8, 100]);
      }
      const skulls = spawned.filter(([name, o]) => name === 'model' && o.model === MODEL.laser);
      expect(skulls.map(([, o]) => [o.scale, o.blend])).toEqual(Array(4).fill([1.3, 'subtract']));
      expect(spawned.map(([name]) => name)).not.toContain('spiritSwarm');
    }
  });
});
