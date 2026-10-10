import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The bitmap is fetched from Data/ in the browser; here it never lands.
vi.mock('../../controllers/assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadMuSprite: () => new Promise(() => {}),
}));

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh, Skeleton, type Material } from '../../controllers/render/babylon/exports';
import { getMaterial } from '../../controllers/assets/modelLoader';
import { BlendState } from '@versions/shared/objects/enum';
import type { Entity, World } from '../../ecs/world';
import { DropObject } from './dropObject';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** A converted body part: one mesh per BMD mesh, each on its own opaque JPG. */
function part(textures: string[]) {
  const root = new Mesh('part', scene);
  for (const name of textures) {
    const mesh = new Mesh(name, scene);
    mesh.parent = root;
    mesh.metadata = { characterAsset: true, skinTexture: false, diffuseTexture: { name } };
    mesh.material = getMaterial(scene, true, 0, BlendState.ALPHA_DISABLE, false, false, true);
  }
  return { mesh: root, skeleton: new Skeleton('part', 'part', scene), animationGroups: [] };
}

async function drop(group: number, num: number, textures: string[]) {
  const object = new DropObject(scene);
  const entity = { droppedItem: { group, num, isMoney: false } } as unknown as Entity;
  await object.init({} as World, entity);
  object.load(part(textures));
  return object;
}

const texture = (object: DropObject, mesh: number) =>
  (object.getMesh(mesh)?.metadata?.diffuseTexture as { name: string }).name;
const material = (object: DropObject, mesh: number) => object.getMesh(mesh)?.material as Material;

// RenderPartObjectBody under HideSkin (ZzzObject.cpp:7774-7790): mesh 0 takes the bitmap
// ZzzOpenData.cpp:556-563 loads, a 32-bit TGA, so it is alpha-tested (ZzzBMD.cpp:1517).
describe('a dropped Faith or Queen armour or pants', () => {
  it.each([
    [8, 50, 'Item3002_Armor', 'Player/Item312_Armoritem.OZT'],
    [9, 50, 'Item3002_Pant', 'Player/Item312_Pantitem.OZT'],
    [8, 53, 'Item6001_Armor', 'Player/SkinClass706_upperitem.OZT'],
  ])('%i/%i draws mesh 0 (%s) with %s', async (group, num, own, bitmap) => {
    const object = await drop(group, num, [own]);
    expect(texture(object, 0)).toBe(bitmap);
    expect(material(object, 0).transparencyMode).toBe(3);
    expect(material(object, 0).backFaceCulling).toBe(false);
    expect(object.getMesh(0)?.isVisible).toBe(true);
  });

  it('Queen pants: mesh 0 is the tail, and it takes the bitmap; the pants keep theirs', async () => {
    const object = await drop(9, 53, ['Item6001_lowertail', 'Item6001_Pant']);
    expect(texture(object, 0)).toBe('Player/SkinClass706_loweritem.OZT');
    expect(texture(object, 1)).toBe('Item6001_Pant');
    expect(material(object, 1).transparencyMode).toBe(0);
  });

  it('every other part keeps its own textures', async () => {
    const object = await drop(8, 51, ['Item3003_Armor']);
    expect(texture(object, 0)).toBe('Item3003_Armor');
    expect(material(object, 0).transparencyMode).toBe(0);
  });
});
