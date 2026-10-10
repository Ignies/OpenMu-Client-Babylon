import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The layer is fetched from Data/ in the browser; here it never lands.
vi.mock('../assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadMuSprite: () => new Promise(() => {}),
}));

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh, Skeleton, type Texture } from '../render/babylon/exports';
import type { World } from '../../ecs/world';
import { WingObject } from './wingObject';
import { wingSpec } from './wings';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** A converted wing: one mesh per BMD mesh. */
function wing(meshes: number) {
  const root = new Mesh('wing', scene);
  for (let i = 0; i < meshes; i++) {
    const mesh = new Mesh(`mesh${i}`, scene);
    mesh.parent = root;
    mesh.metadata = {};
  }
  return { mesh: root, skeleton: new Skeleton('wing', 'wing', scene), animationGroups: [] };
}

const tick = { TotalGameTime: { TotalSeconds: 1 } } as World['gameTime'];

// Wing of Ruin draws mesh 1 again with BITMAP_3RDWING_LAYER (ZzzObject.cpp:6944-6946).
describe('the Wing of Ruin layer', () => {
  it('is read top-down, like the GLB textures it shares the UVs of', () => {
    const object = new WingObject(scene);
    object.prepare(wingSpec({ group: 12, num: 39 } as Parameters<typeof wingSpec>[0]));
    object.load(wing(2));
    object.Update(tick);

    const layer = object.getMesh(2)?.metadata?.diffuseTexture as Texture;
    expect(layer.name).toContain('Item/msword01_r.OZJ');
    expect(layer.invertY).toBe(false);
  });
});
