import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { combat } from '@/controllers/combat';
import { lighting } from '@/controllers/lighting';
import { jointCount } from '@/controllers/fx/joint';
import { MODEL } from '@/controllers/fx/recipes';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { playAreaSkillVisual, playBowShotVisual } from '../skills/skillVisuals';
import { LAUNCHER_ARROWS } from './launcher_arrows';
import { ARROW_FLIGHTS } from './arrow_flights';
import '../skills/index';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

type Shot = { swirl?: { count: number; colour: number[] }; model?: { model: string; scale?: number}; roll?: number; joint?: { colour: number[]; maxTails: number }; puffs?: unknown[] };
let engine: NullEngine;
let scene: Scene;
const shots: Shot[] = [];
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  vi.spyOn(lighting, 'arrow').mockReturnValue(null as never);
  const spawn = effects.spawn.bind(effects);
  vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: never, at: never, opts: Shot) => {
    if ((name as string) === 'projectile' && (opts?.model || opts?.swirl)) shots.push(opts);
    return spawn(name, s, at, opts as never);
  }) as never);
});
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

let ids = 100;
const mk = (): Entity => ({ netId: ids++, transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0, 0), scale: 1 } }) as unknown as Entity;
const target = { netId: 2, transform: { pos: new Vector3(103, 0, 104), rot: new Vector3(0, 0, 0), scale: 1 } } as unknown as Entity;

function withBow(launcher: number, fire: () => void): Shot[] {
  shots.length = 0;
  effects.reset();
  const spy = vi.spyOn(combat, 'equippedLauncher').mockReturnValue({ num: launcher } as never);
  fire();
  for (let i = 0; i < 40; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
  spy.mockRestore();
  return [...shots];
}

describe('an arrow flies the way its model does', () => {
  it('the Albatross Bow shot rides a green ribbon of 16 tails at Scale 1', () => {
    const [s] = withBow(22, () => playBowShotVisual(scene, mk(), target));
    expect(s?.joint).toMatchObject({ colour: [0.4, 0.9, 0.5], maxTails: 16 });
    expect(s?.model).toMatchObject({ model: LAUNCHER_ARROWS[22].model, scale: 1 });
  });

  it('the Arrow Viper Bow shot spins 60 degrees a tick and keeps its violet ribbon', () => {
    const [s] = withBow(20, () => playBowShotVisual(scene, mk(), target));
    expect(s?.roll).toBeCloseTo((60 * Math.PI) / 180 / 0.04);
    expect(s?.joint?.colour).toEqual([0.6, 0.2, 0.8]);
  });

  it('a Triple Shot flies every arrow the same way', () => {
    const made = withBow(21, () => playAreaSkillVisual(scene, 24, mk(), { x: 103, y: 104 }, () => 0, null));
    expect(made.length).toBeGreaterThanOrEqual(3);
    for (const s of made) expect(s.joint).toMatchObject({ colour: [1, 1, 1], maxTails: 16 });
  });

  it('a plain bow arrow leaves its fire puffs and no ribbon', () => {
    const [s] = withBow(0, () => playBowShotVisual(scene, mk(), target));
    expect(s?.model).toMatchObject({ model: MODEL.arrow, scale: 0.8 });
    expect(s?.puffs).toHaveLength(1);
    expect(s?.joint).toBeUndefined();
  });

  it('the ribbon ends with the arrow', () => {
    withBow(22, () => playBowShotVisual(scene, mk(), target));
    for (let i = 0; i < 100; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
    expect(jointCount()).toBe(0);
  });

  it('the Celestial Bow shot has no body, only its four blue swirl ribbons (MODEL_ARROW_HOLY)', () => {
    const [s] = withBow(17, () => playBowShotVisual(scene, mk(), target));
    expect(s?.model).toBeUndefined();
    expect(s?.swirl).toMatchObject({ count: 4, colour: [0.2, 0.2, 1] });
  });

  it('every flight row names an arrow model the launchers throw', () => {
    const thrown = new Set<string>([...Object.values(LAUNCHER_ARROWS).map(a => a.model), MODEL.arrow, MODEL.arrowImpact, MODEL.arrowHoly]);
    for (const model of Object.keys(ARROW_FLIGHTS)) expect(thrown.has(model)).toBe(true);
  });
});
