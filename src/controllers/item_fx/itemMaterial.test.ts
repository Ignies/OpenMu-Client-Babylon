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
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createItemMaterial } from './itemMaterial';

const engine = new NullEngine();
const scene = new Scene(engine);
new FreeCamera('camera', Vector3.Zero(), scene);
afterAll(() => engine.dispose());

/** The fragment the legacy passes are folded into. */
const passes = (flatLit: boolean) =>
  (createItemMaterial(scene, false, flatLit, true) as unknown as { CustomParts: { Fragment_Before_FragColor: string } })
    .CustomParts.Fragment_Before_FragColor;

describe('the per-mesh texture bind', () => {
  it('is installed on a material made while the scene is not ready, as the hero wing made after the load', () => {
    const waiting = {};
    scene.addPendingData(waiting);
    const material = createItemMaterial(scene, true, false);
    scene.render();
    expect(material.onBindObservable.observers.length).toBe(1);
    scene.removePendingData(waiting);
  });
});

describe('the legacy item passes', () => {
  it('redraw an excellent item by the vertex light of a lit body', () => {
    expect(passes(false)).toContain('vec3 lit = clamp(diffuseBase, vec3(0.2), vec3(1.2));');
  });

  it('redraw it by BodyLight alone when flat lit, as a bag item with LightEnable off (ZzzInventory.cpp:9682)', () => {
    expect(passes(true)).toContain('vec3 lit = muBodyLight.rgb;');
  });
});

describe('the scroll materials\' look-ups', () => {
  it('read RENDER_METAL\'s by the normal, Shiny01 at (z * 0.5 + 0.2, y * 0.5 + 0.5) (ZzzBMD.cpp:1642-1646)', () => {
    const diffuse = (createItemMaterial(scene, false, true, true) as unknown as { CustomParts: { Fragment_Custom_Diffuse: string } }).CustomParts
      .Fragment_Custom_Diffuse;
    expect(diffuse).toContain('} else if (muMap == 8) {\n          muUv = vec2(n.z * 0.5 + 0.2, n.y * 0.5 + 0.5);');
  });
});

describe('the flat-lit material', () => {
  it('draws the texel at BodyLight, as RenderMesh with LightEnable off colours it (ZzzBMD.cpp:1740-1745)', () => {
    const fog = (createItemMaterial(scene, false, true, true) as unknown as { CustomParts: { Fragment_Before_Fog: string } }).CustomParts.Fragment_Before_Fog;
    expect(fog).toContain('color.rgb = baseColor.rgb * vDiffuseColor.rgb * muBodyLight.rgb;');
  });
});
