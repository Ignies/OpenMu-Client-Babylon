import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { MODEL } from '@/controllers/fx/recipes';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { playAreaSkillVisual } from '../../skillVisuals';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import '../../../improvements/all';

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

const caster = { netId: 1, transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0, 0), scale: 1 } } as unknown as Entity;
const cast = (id: number) => {
  effects.reset();
  spawned.length = 0;
  playAreaSkillVisual(scene, id, caster, { x: 103, y: 104 }, () => 0, null);
  for (let i = 0; i < 50; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
  return spawned.map(([name]) => name);
};

// AT_SKILL_FLAME: one BITMAP_FLAME sub0 at SkillXY, LT 40, six tongues a tick within 25 cm and a MODEL_STONE1/2
// one tick in 8 (ZzzCharacter.cpp:4479-4485, ZzzEffect.cpp:1080-1084, MoveHandlers.cpp:1802-1814).
describe('Flame', () => {
  it('stands the original tongue column on Classic, our pillars on Enhanced', () => {
    for (const id of [5, 378, 483]) {
      setFidelityChoice(FIDELITY_CLASSIC, {});
      const classic = cast(id);
      expect(classic.filter(n => n === 'column')).toHaveLength(1);
      expect(classic).not.toContain('pillar');
      const column = spawned.find(([name]) => name === 'column')?.[1] ?? {};
      expect([column.seconds, column.radius, column.rate]).toEqual([40 * 0.04, 0.25, 150]);
      for (const [name, o] of spawned) if (name === 'debris') expect([MODEL.stone, MODEL.stone2]).toContain(o.model);
      setFidelityChoice(FIDELITY_DEFAULT, {});
      const enhanced = cast(id);
      expect(enhanced).toContain('pillar');
      expect(enhanced).not.toContain('column');
    }
  });
});
