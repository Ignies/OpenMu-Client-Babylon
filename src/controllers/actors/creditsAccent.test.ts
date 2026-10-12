import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The effect sheets come from Data/ in the browser; here they never land.
vi.mock('@/controllers/assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  hasDataFile: () => true,
  downloadDataFile: () => new Promise(() => {}),
  loadMuSprite: () => new Promise(() => {}),
}));

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '../render/babylon/exports';
import { RGBS, TEX } from '../fx/recipes';
import { ARCS, MOTES, CreditsAccent, GLOW, RING, SPARKS, ringArc } from './creditsAccent';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

describe('the credits accent', () => {
  it('keeps its colour and size', () => {
    expect(RING.colour).toEqual([1, 1, 1]);
    expect(RING.diameter).toBeGreaterThanOrEqual(0.45);
  });

  it('draws its arcs with the thunder sheet, re-rolled every few ticks', () => {
    expect(ARCS.texture).toBe(TEX.jointThunder);
    expect(ARCS.colour).toEqual(RGBS.arc);
    expect(ARCS.rerollTicks).toBeGreaterThanOrEqual(2);
    expect(ARCS.rerollTicks).toBeLessThanOrEqual(4);
  });

  it('draws its particles with the flare', () => {
    for (const p of [SPARKS, MOTES, GLOW]) expect(p.texture).toBe(TEX.flare);
    expect(SPARKS.radius).toBe(RING.diameter / 2);
    expect(GLOW.minSize).toBeGreaterThan(MOTES.maxSize);
  });
});

describe('ringArc', () => {
  it('starts and ends on the ring and stays near it between', () => {
    const r = RING.diameter / 2;
    const out = new Float32Array((ARCS.segments + 1) * 3 + 3);
    ringArc(out, 3, 0.5, 1.2, 7);
    const at = (i: number) => [out[3 + i * 3], out[4 + i * 3], out[5 + i * 3]];
    const [x0, y0, z0] = at(0);
    const [x1, y1, z1] = at(ARCS.segments);
    expect(Math.hypot(x0, z0)).toBeCloseTo(r);
    expect(Math.hypot(x1, z1)).toBeCloseTo(r);
    expect(y0).toBeCloseTo(0);
    expect(y1).toBeCloseTo(0);
    for (let i = 1; i < ARCS.segments; i++) {
      const [x, y, z] = at(i);
      expect(Math.abs(Math.hypot(x, z) - r)).toBeLessThanOrEqual(ARCS.jitter + 1e-6);
      expect(Math.abs(y)).toBeLessThanOrEqual(ARCS.jitter + 1e-6);
    }
    expect(out.slice(0, 3)).toEqual(new Float32Array(3));
  });
});

describe('CreditsAccent', () => {
  it('adds its meshes and particle systems and takes them all away', () => {
    new CreditsAccent(scene).dispose(); // the shared mesh stays
    const meshes = scene.meshes.length;
    const systems = scene.particleSystems.length;
    const mark = new CreditsAccent(scene);
    expect(scene.particleSystems.length).toBe(systems + 3);
    expect(scene.meshes.length).toBe(meshes + 2);
    mark.dispose();
    expect(scene.particleSystems.length).toBe(systems);
    expect(scene.meshes.length).toBe(meshes);
  });

  it('follows the head and hides with the body', () => {
    const mark = new CreditsAccent(scene);
    const added = scene.meshes.slice(-2);
    const head = new Vector3(1, 2, 3);
    mark.place(head, new Vector3(1, 0, 3), true);
    for (const m of added) expect(m.position.equals(head)).toBe(true);
    mark.place(head, head, false);
    for (const m of added) expect(m.isEnabled()).toBe(false);
    expect(scene.particleSystems.slice(-3).every(p => p.emitRate === 0)).toBe(true);
    mark.place(head, head, true);
    for (const m of added) expect(m.isEnabled()).toBe(true);
    expect(scene.particleSystems.slice(-3).every(p => p.emitRate > 0)).toBe(true);
    mark.dispose();
  });
});
