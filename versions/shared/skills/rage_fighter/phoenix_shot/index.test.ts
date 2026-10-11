import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { playAreaSkillVisual, playTargetedSkillVisual } from '../../skillVisuals';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import '../../../improvements/all';

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
afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

function cast(): string[] {
  spawned.length = 0;
  effects.reset();
  const at = (x: number) => ({ netId: x, transform: { pos: new Vector3(x, 0, 100), rot: new Vector3(0, 0, 0), scale: 1 } }) as unknown as Entity;
  const caster = at(100);
  const target = at(103);
  playTargetedSkillVisual(scene, 270, caster, target);
  playAreaSkillVisual(scene, 270, caster, { x: 103, y: 100 }, () => 0, target);
  for (let i = 0; i < 40; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
  return spawned;
}

// AT_SKILL_PHOENIX_SHOT: RageCreateEffect's MODEL_PHOENIX_SHOT case is never called (SkillCast.cpp:772-931,
// WSclient.cpp:5038) and the model has no move or LifeTime (ZzzEffect.cpp:6218): the original draws nothing.
describe('Phoenix Shot', () => {
  it('draws nothing on Classic', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(cast()).toEqual([]);
  });

  it('keeps our phoenix arrow, fire hit and phoenix on Enhanced', () => {
    expect(cast()).toContain('model');
  });
});
