import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { MODEL } from '@/controllers/fx/recipes';
import { GameOptions } from '@/controllers/settings/gameOptions';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { playAreaSkillVisual } from './skillVisuals';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
let made: [string, boolean | undefined][] = [];
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  GameOptions.lightingQuality = 0;
  const real = effects.spawn.bind(effects);
  vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: Scene, at: Vector3, opts: never) => {
    if (name === 'model') made.push([(opts as { model: string }).model, (opts as { heroSkill?: boolean }).heroSkill]);
    return real(name, s, at, opts);
  }) as never);
});
afterAll(() => {
  vi.restoreAllMocks();
  effects.reset();
  scene.dispose();
  engine.dispose();
});

const body = (netId: number, x: number, z: number, more: object = {}): Entity =>
  ({ netId, transform: { pos: new Vector3(x, 0, z), rot: new Vector3(0, 0.5, 0), scale: 1 }, ...more }) as unknown as Entity;

/** The models a cast spawns, with whether each was marked the hero's own skill effect. */
function cast(id: number, hero: boolean): [string, boolean | undefined][] {
  made = [];
  effects.reset();
  const caster = body(1, 100, 100, hero ? { localPlayer: true } : {});
  playAreaSkillVisual(scene, id, caster, { x: 103, y: 104 }, () => 0, body(2, 103, 104));
  for (let i = 0; i < 150; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
  return made;
}

// CSkillEffectMgr::IsSkillEffect (SkillEffectMgr.cpp:33-62): owned by the Hero, these go to g_SkillEffects.
describe('the hero\'s own skill effects', () => {
  it.each([
    ['Hell Fire, MODEL_CIRCLE sub0', 10, MODEL.circle],
    ['Inferno, MODEL_SKILL_INFERNO sub0', 14, MODEL.inferno],
    ['Twister, MODEL_STORM sub0', 8, MODEL.storm],
    ['Fire Scream, MODEL_DARK_SCREAM', 78, MODEL.darkScream],
  ])('%s is marked when the hero casts it, and only then', (_name, id, model) => {
    const mine = cast(id, true);
    expect(mine.filter(([m]) => m === model).length).toBeGreaterThan(0);
    expect(mine.every(([m, own]) => (m === model) === (own === true))).toBe(true);
    expect(cast(id, false).some(([, own]) => own !== undefined)).toBe(false);
  });
});
