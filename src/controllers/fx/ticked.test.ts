import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { tickedLayer, type TailStrip } from './ticked';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterAll(() => {
  tickedLayer.reset?.();
  scene.dispose();
  engine.dispose();
});

describe('ticked strips', () => {
  it('maxSegment: a segment whose tail centres lie further apart is not drawn (RenderJoints, ZzzEffectJoint.cpp:7071-7075)', () => {
    let strip: TailStrip | null = null;
    tickedLayer.spawn(scene, Vector3.Zero(), {
      tick(fx) {
        strip ??= fx.strip({ texture: 'Effect/ground_wind.OZJ', maxTails: 4, faces: 'flat', maxSegment: 0.6 });
        // Newest first: 1.3 -> 1.0 is 0.3 apart, 1.0 -> 0 is 1.0.
        for (const x of [0, 1, 1.3]) strip.push(x, 0, 0, 0.1, 0, 0);
        return false;
      },
    });
    const positions = (strip as unknown as { batch: { mesh: Mesh } }).batch.mesh.getVerticesData('position') ?? [];
    const y = (vertex: number): number => positions[vertex * 3 + 1];
    // Four corners a segment: the first drawn on the ground, the second parked out of sight (-1000).
    expect([0, 1, 2, 3].map(y)).toEqual([0, 0, 0, 0]);
    expect([4, 5, 6, 7].map(y)).toEqual([-1000, -1000, -1000, -1000]);
  });
});
