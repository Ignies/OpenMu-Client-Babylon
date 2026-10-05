import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ecs } from '../../ecs/current';
import type { World } from '../../ecs/world';
import { TerrainDecal } from './moveTargetEffect';
import { ringLayer, spawnRing } from './ring';
import { TICK } from './core';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  Ecs.world = { scene, mapParent: null, getTerrainHeight: () => 0 } as unknown as World;
});
afterAll(() => {
  ringLayer.reset?.();
  Ecs.world = null;
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

describe('ring', () => {
  it('scaleAt: the diameter each frame from the time alive, a per-tick Scale curve (BITMAP_MAGIC sub13 x1.1 a move)', () => {
    const draw = vi.spyOn(TerrainDecal.prototype, 'draw');
    const moves = (t: number): number => Math.floor(t / TICK + 1e-6);
    spawnRing(scene, new Vector3(10, 0, 10), { texture: 'Effect/Magic_Ground1.OZJ', seconds: 3 * TICK, scale: 99, scaleAt: t => 1.1 ** moves(t) });
    for (let i = 0; i < 4; i++) ringLayer.update?.(0, TICK);
    // Drawn after moves 1 and 2; the third frame ends it.
    expect(draw.mock.calls.map(c => c[3])).toEqual([1.1, 1.1 ** 2]);
  });
});
