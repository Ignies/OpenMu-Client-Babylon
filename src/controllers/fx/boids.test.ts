import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { boidFactoryFor, boidsFor } = await import('./boids');
const { ENUM_WORLD } = await import('../../core/types');
await import('@versions/shared/maps/all');

// RenderBoids and RenderFishs shadow every boid and fish from the ground under it (GOBoid.cpp:1585-1600, :1630-1640).
describe('a boid', () => {
  it('casts the Classic shadow from the ground under it, and none on the cascades', () => {
    const scene = new Scene(new NullEngine());
    const specs = [boidsFor(ENUM_WORLD.WD_0LORENCIA), boidsFor(ENUM_WORLD.WD_7ATLANSE), boidsFor(ENUM_WORLD.WD_0LORENCIA, 1)];
    expect(specs.map(spec => spec?.kind)).toEqual(['bird', 'fish', 'dragon']);
    for (const spec of specs) {
      if (!spec) continue;
      const boid = new (boidFactoryFor(spec, spec.models[0]))(scene);
      expect([boid.CastsShadow, boid.ClassicShadow, boid.ShadowFromGround, boid.CascadeShadow]).toEqual([true, true, true, false]);
    }
    scene.getEngine().dispose();
  });
});
