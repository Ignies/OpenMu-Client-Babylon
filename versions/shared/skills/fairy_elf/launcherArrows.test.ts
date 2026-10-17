import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { combat } from '@/controllers/combat';
import { MODEL } from '@/controllers/fx/recipes';
import { lighting } from '@/controllers/lighting';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { playAreaSkillVisual, playTargetedSkillVisual } from '../skillVisuals';
import { LAUNCHER_ARROWS } from '../../items/launcher_arrows';
import '../index';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
const shot: string[] = [];
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  // Headless: no terrain under the arrows' lights.
  vi.spyOn(lighting, 'arrow').mockReturnValue(null as never);
  const spawn = effects.spawn.bind(effects);
  vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: never, at: never, opts: { model?: { model: string } }) => {
    if ((name as string) === 'projectile' && opts?.model) shot.push(opts.model.model);
    return spawn(name, s, at, opts as never);
  }) as never);
});
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

function cast(id: number, launcher: number | null, targeted = false): string[] {
  shot.length = 0;
  effects.reset();
  const spy = vi.spyOn(combat, 'equippedLauncher').mockReturnValue(launcher === null ? null : ({ num: launcher } as never));
  const caster = { netId: 1, transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0, 0), scale: 1 } } as unknown as Entity;
  const target = { netId: 2, transform: { pos: new Vector3(103, 0, 104), rot: new Vector3(0, 0, 0), scale: 1 } } as unknown as Entity;
  if (targeted) playTargetedSkillVisual(scene, id, caster, target);
  else playAreaSkillVisual(scene, id, caster, { x: 103, y: 104 }, () => 0, null);
  for (let i = 0; i < 40; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
  spy.mockRestore();
  return [...new Set(shot)];
}

// CreateArrows hands the skill's arrows to CreateArrow, which picks the model by the bow in hand
// (ZzzEffectMagicSkill.cpp:174-251), the same arrow as the plain shot.
describe('bow skills throw the arrow of the bow in hand', () => {
  for (const [id, name] of [[24, 'Triple Shot'], [235, 'Multi-Shot']] as const) {
    it(name, () => {
      expect(cast(id, 22)).toContain(LAUNCHER_ARROWS[22].model);
      expect(cast(id, 22)).not.toContain(MODEL.arrow);
      expect(cast(id, 0)).toContain(MODEL.arrow);
      expect(cast(id, null)).toContain(MODEL.arrow);
    });
  }
});

// CreateArrows -> CreateArrow for Penetration, Ice Arrow and the generic skill path (Poison Arrow has no
// branch of its own): the bow's arrow (ZzzEffectMagicSkill.cpp:310-349, ZzzCharacter.cpp:4821-4909).
describe('the other bow skills throw the arrow of the bow in hand', () => {
  for (const [id, name, targeted] of [[52, 'Penetration', false], [51, 'Ice Arrow', true], [427, 'Poison Arrow', true], [434, 'Poison Arrow (str)', true]] as const) {
    it(name, () => {
      expect(cast(id, 22, targeted)).toContain(LAUNCHER_ARROWS[22].model);
      expect(cast(id, 22, targeted)).not.toContain(MODEL.arrow);
      expect(cast(id, 8, targeted)).toContain(LAUNCHER_ARROWS[8].model);
      expect(cast(id, null, targeted)).toContain(MODEL.arrow);
    });
  }

  // CreateArrow: AT_SKILL_DEEPIMPACT throws MODEL_ARROW_IMPACT whatever the bow (ZzzEffectMagicSkill.cpp:223-225).
  it('Starfall throws the impact model, not the bow arrow', () => {
    for (const launcher of [22, 0, null]) {
      const made = cast(46, launcher, true);
      expect(made).toContain(MODEL.arrowImpact);
      expect(made).not.toContain(LAUNCHER_ARROWS[22].model);
    }
  });
});
