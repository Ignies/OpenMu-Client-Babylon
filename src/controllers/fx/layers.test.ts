import { describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { EFFECT_LAYERS } = await import('./layers');
const { shroudLayer, SHROUD_MAX } = await import('./shroud');

// Ours (Evil Spirit, Skill effects: Enhanced): the shroud never stacks past SHROUD_MAX cards into a black screen.
describe('the shroud', () => {
  it('is a layer and draws at most SHROUD_MAX cards at once', () => {
    expect(EFFECT_LAYERS.map(layer => layer.name)).toContain('shroud');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const handles = Array.from({ length: SHROUD_MAX + 2 }, () => shroudLayer.spawn(scene, new Vector3(), { seconds: 1 }));
    expect(handles.map(h => h.alive)).toEqual([...Array(SHROUD_MAX).fill(true), false, false]);
    shroudLayer.update?.(0 as never, 2);
    expect(shroudLayer.spawn(scene, new Vector3(), { seconds: 1 }).alive).toBe(true);
    shroudLayer.reset?.();
    scene.dispose();
    engine.dispose();
  });
});
