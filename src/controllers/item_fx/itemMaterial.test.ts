import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The chrome maps are fetched from Data/ in the browser; here they never land.
vi.mock('../assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadMuSprite: () => new Promise(() => {}),
}));

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { createItemMaterial } from './itemMaterial';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** The fragment the legacy passes are folded into. */
const passes = (flatLit: boolean) =>
  (createItemMaterial(scene, false, flatLit, true) as unknown as { CustomParts: { Fragment_Before_FragColor: string } })
    .CustomParts.Fragment_Before_FragColor;

describe('the legacy item passes', () => {
  it('redraw an excellent item by the vertex light of a lit body', () => {
    expect(passes(false)).toContain('vec3 lit = clamp(diffuseBase, vec3(0.2), vec3(1.2));');
  });

  it('redraw it by BodyLight alone when flat lit, as a bag item with LightEnable off (ZzzInventory.cpp:9682)', () => {
    expect(passes(true)).toContain('vec3 lit = muBodyLight.rgb;');
  });
});
