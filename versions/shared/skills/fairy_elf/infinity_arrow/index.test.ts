import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { MODEL } from '@/controllers/fx/recipes';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { playTargetedSkillVisual } from '../../skillVisuals';
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
afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

function cast(id: number): [string, Record<string, unknown>][] {
  spawned.length = 0;
  effects.reset();
  const caster = { netId: 1, transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0, 0), scale: 1 } } as unknown as Entity;
  playTargetedSkillVisual(scene, id, caster, caster);
  for (let i = 0; i < 20; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
  return spawned;
}

// AT_SKILL_INFINITY_ARROW: MODEL_INFINITY_ARROW at the caster, which makes arrowsre01 (drawing only its flare joints)
// and the rings arrowsre02-05 (WSclient.cpp:4882-4888, ZzzEffect.cpp:435-457).
describe('Infinity Arrow', () => {
  // Each flare joint's white AddTerrainLight (ZzzEffectJoint.cpp:6013-6015): one light per bone it sends joints from.
  it('lights the ground under its flare joints on Classic only', () => {
    const lit = vi.spyOn(lighting, 'skillBody');
    setFidelityChoice(FIDELITY_CLASSIC, {});
    cast(77);
    expect(lit.mock.calls.filter(([, skill, body]) => skill === 77 && body === 'flare')).toHaveLength(8);
    lit.mockClear();
    setFidelityChoice(FIDELITY_DEFAULT, {});
    cast(77);
    expect(lit).not.toHaveBeenCalled();
    lit.mockRestore();
  });

  it('makes the original rings on Classic', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    for (const id of [77, 441]) {
      const s = cast(id);
      expect(s.filter(([n]) => n === 'model').map(([, o]) => o.model)).toEqual(MODEL.infinityArrow.slice(1));
      expect(s.filter(([n]) => n === 'summon').map(([, o]) => o.model)).toEqual([MODEL.infinityArrow[0]]);
      expect(s.map(([n]) => n)).not.toContain('particles');
      const burst = s.find(([, o]) => o.model === MODEL.infinityArrow[4])?.[1] as { seconds: number; scaleAt: (t: number) => number };
      expect([burst.seconds, burst.scaleAt(0.04 * 3)]).toEqual([0.6, 1.2 ** 3]);
    }
  });

  it('keeps our blue flash and ice motes on Enhanced', () => {
    const s = cast(77);
    expect(s.map(([n]) => n).sort()).toEqual(['particles', 'sprite']);
  });
});
