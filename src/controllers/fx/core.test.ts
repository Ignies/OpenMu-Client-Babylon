import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { additiveMaterial, disposePools } from './core';

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

describe('additiveMaterial', () => {
  it('a flickering tint makes a bounded number of materials, not one a frame', () => {
    const sheet = new Texture(null, scene);
    const made = new Set<unknown>();
    for (let frame = 0; frame < 1000; frame++) {
      const f = 0.85 + 0.15 * Math.sin(frame / 7);
      made.add(additiveMaterial(scene, sheet, [1.6 * f, 0.4 * f, 0.2 * f]));
    }
    expect(made.size).toBeLessThan(25);
  });

  it('keeps the tint within half a step of the one asked for', () => {
    const sheet = new Texture(null, scene);
    const m = additiveMaterial(scene, sheet, [0.5, 0.26, 0.1]);
    expect(Math.abs(m.emissiveColor.r - 0.5)).toBeLessThanOrEqual(1 / 64);
    expect(Math.abs(m.emissiveColor.g - 0.26)).toBeLessThanOrEqual(1 / 64);
    expect(Math.abs(m.emissiveColor.b - 0.1)).toBeLessThanOrEqual(1 / 64);
  });
});
