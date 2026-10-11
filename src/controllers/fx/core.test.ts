import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { additiveMaterial, disposePools, emitBurst, particleSystemFor, type ParticleRecipe } from './core';

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
  disposePools();
  scene.dispose();
  engine.dispose();
});

describe('a particle burst', () => {
  const recipe: ParticleRecipe = { texture: 'Effect/flare01.OZJ', colour: [1, 1, 1], size: 1, life: 1 };
  afterEach(() => vi.unstubAllGlobals());

  // Particles only age on a drawn frame: queued while hidden, they would all burst out on return.
  it('emits nothing while the page is hidden', () => {
    vi.stubGlobal('document', { hidden: true });
    emitBurst(scene, recipe, new Vector3(), 10);
    expect(particleSystemFor(scene, recipe).manualEmitCount).toBeLessThanOrEqual(0);
    vi.stubGlobal('document', { hidden: false });
    emitBurst(scene, recipe, new Vector3(), 10);
    expect(particleSystemFor(scene, recipe).manualEmitCount).toBe(10);
  });
});

describe('additiveMaterial', () => {
  it('a flickering tint makes a bounded number of materials, not one a frame', () => {
    const sheet = new Texture(null, scene);
    const made = new Set<unknown>();
    for (let frame = 0; frame < 5000; frame++) {
      const f = 0.85 + 0.15 * Math.sin(frame / 7);
      made.add(additiveMaterial(scene, sheet, [1.6 * f, 0.4 * f, 0.2 * f]));
    }
    // At most one material per 1/128 step of each channel's span (0.48, 0.12, 0.06); a 1/255 key made 123.
    expect(made.size).toBeLessThanOrEqual(Math.ceil((0.48 + 0.12 + 0.06) * 128) + 3);
  });

  it('keeps the tint within half a step of 1/128 of the one asked for, under one 8-bit level', () => {
    const sheet = new Texture(null, scene);
    const m = additiveMaterial(scene, sheet, [0.5, 0.26, 0.1]);
    expect(Math.abs(m.emissiveColor.r - 0.5)).toBeLessThanOrEqual(1 / 256);
    expect(Math.abs(m.emissiveColor.g - 0.26)).toBeLessThanOrEqual(1 / 256);
    expect(Math.abs(m.emissiveColor.b - 0.1)).toBeLessThanOrEqual(1 / 256);
  });
});
