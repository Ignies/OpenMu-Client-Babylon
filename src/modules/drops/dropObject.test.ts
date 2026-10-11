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
import { isSkinOrHairTexture } from '../../controllers/actors/skinTexture';
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
    // The skin flag as the model loader reads it off the texture name.
    mesh.metadata = { characterAsset: true, skinTexture: isSkinOrHairTexture(name), diffuseTexture: { name } };
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
/** The indices of the meshes still drawn. */
const drawn = (object: DropObject) => object.getMeshes().flatMap((mesh, i) => (mesh.isVisible ? [i] : []));

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

// The other HideSkin swaps: Mistery to Lilium (ZzzObject.cpp:7706-7729, bitmaps ZzzOpenData.cpp:550-553)
// and Lucky 65 / 70 (ZzzObject.cpp:8897-8908, bitmaps ZzzOpenData.cpp:1794-1802). Meshes 1.. keep theirs.
describe('a dropped Mistery to Lilium or Lucky armour or pants', () => {
  it.each([
    [8, 39, ['SkinClass106_upper'], 'Player/InvenArmorMale40.OZT'],
    [8, 44, ['SkinClass606_upper', 'SkinClass606_glovecloth'], 'Player/InvenArmorMale45.OZT'],
    [9, 40, ['Skinclass206_lower', 'Skinclass206_lowertail'], 'Player/InvenPantsMale41.OZT'],
    [9, 44, ['SkinClass606_lower', 'SkinClass606_lowertail'], 'Player/InvenPantsMale45.OZT'],
    [8, 65, ['SkinClass luck106_upper'], 'Player/LuckyItem/65/InvenArmorMale40_luck.OZT'],
    [8, 70, ['Skinclass luck206_upper'], 'Player/LuckyItem/70/InvenArmorMale41_luck.OZT'],
    [9, 65, ['SkinClass luck106_lower'], 'Player/LuckyItem/65/InvenPantsMale40_luck.OZT'],
    [9, 70, ['Skinclass luck206_lower', 'Skinclass luck206_lowertail'], 'Player/LuckyItem/70/InvenPantsMale41_luck.OZT'],
  ])('%i/%i draws mesh 0 of %j with %s', async (group, num, own, bitmap) => {
    const object = await drop(group, num, own);
    expect(texture(object, 0)).toBe(bitmap);
    expect(material(object, 0).transparencyMode).toBe(3);
    expect(drawn(object)).toEqual(own.map((_, i) => i));
    if (own[1]) expect(texture(object, 1)).toBe(own[1]);
  });
});

// The HideSkin branches that call RenderMesh for some meshes in place of RenderBody
// (ZzzObject.cpp:7614-7637, :7663-7737, :7797-7839, :8781-8786, :8837-8853), and the Lucky
// helms, which draw one mesh on every render (:8887-8895).
describe('a drop the original draws only some meshes of', () => {
  it.each([
    [7, 39, ['SkinClass106head_N', 'SkinClass106headhair_N', 'SkinClass106_headhelmet'], [2]], // Mistery
    [7, 40, ['Skinclass206head_N', 'Skinclass206_headhelmet'], [1]],
    [7, 41, ['SkinClass306_headhelmet', 'SkinClass306headhair_N', 'SkinClass306head_N', 'SkinClass306headhair01_N'], [0]],
    [7, 44, ['SkinClass606head_N', 'SkinClass606headhair_N', 'SkinClass606_headhelmet'], [2]], // Lilium
    [8, 36, ['forest_b1', 'forest_b2', 'armor_upper'], [2]], // Iris
    [9, 36, ['armor_skirt', 'forest_b2'], [0]],
    [10, 36, ['armor_arm', 'forest_h1'], [0]],
    [10, 44, ['SkinClass606_glovecloth', 'SkinClass606_glove'], [0]], // Lilium gloves
    [7, 49, ['Item302_Helm', 'Item302_Helm2', 'Item302_Helm'], [0]], // Seraphim
    [8, 49, ['Item302_Armor', 'Item302_Helm', 'Item302_Helm2'], [2]],
    [7, 50, ['Item3002_Head', 'Item3002_Helm', 'Item3002_headhair'], [1]], // Faith
    [7, 53, ['Item6001_head', 'Item6001_headhair', 'Item6001_Helm'], [2]], // Queen
    [8, 31, ['upperta_s', 'upper_s', 'sal_s'], [0, 1]], // Sylphid Ray
    [9, 31, ['lowerta_1', 'lower_s', 'sal_s'], [0, 1]],
    [7, 73, ['Helmet74', 'TKnightA', 'Horn'], [0, 2]], // Phoenix Soul
    [7, 59, ['SFbody', 'SFarmor'], [1]], // Sacred
    [7, 60, ['Item762_Helm', 'Item762_Armor'], [1]], // Storm Hard
    [7, 61, ['Item761_Pant', 'Item761_Helm'], [0]], // Piercing
    [7, 65, ['SkinClass106head_N', 'SkinClass106headhair_N', 'head helmet Luck 40'], [2]], // Lucky
    [7, 70, ['Skinclass206head_N', 'head helmet Luck 40'], [1]],
  ])('%i/%i of %j draws %j', async (group, num, own, meshes) => {
    expect(drawn(await drop(group, num, own))).toEqual(meshes);
  });

  it('the mesh it keeps still goes when it is skin (RenderMesh, ZzzBMD.cpp:1324)', async () => {
    expect(drawn(await drop(7, 50, ['skin_a', 'skin_b', 'skin_c']))).toEqual([]);
  });

  it('every other part draws all but its skin', async () => {
    expect(drawn(await drop(7, 45, ['Item2001_Helm', 'skinClass301']))).toEqual([0]);
  });
});

// ItemObjectAttribute sets `EnableShadow = false` (ZzzObject.cpp:5160), so RenderItems draws no shadow.
describe('a dropped item', () => {
  it('casts no shadow, neither a sun one nor a blob', async () => {
    const object = await drop(0, 0, ['sword']);
    expect(object.CastsShadow).toBe(false);
    expect(object.getMeshes().map(mesh => mesh.metadata.csmCaster)).toEqual([false]);
  });
});

// CreateItemDrop runs ItemObjectAttribute on the model it shows (ZzzObject.cpp:6153, :5155-5292).
describe("a drop's ItemObjectAttribute mesh rules", () => {
  it('draws the Blade mesh 1 additive and skips the Rune Blade mesh 2', async () => {
    const blade = await drop(0, 5, ['a', 'b']);
    expect(blade.getMesh(1)?.metadata.brightMesh).toBe(true);
    expect(blade.getMesh(0)?.metadata.brightMesh).toBeUndefined();
    const rune = await drop(0, 31, ['a', 'b', 'c']);
    expect(rune.HiddenMesh).toBe(2);
  });

  it('pulses the Saint Crossbow, every mesh additive, and lights Wings of Elf mesh 0', async () => {
    const crossbow = await drop(4, 16, ['a', 'b']);
    expect(crossbow.BlendMesh).toBe(-2);
    expect(crossbow.BlendMeshLightAt).not.toBeNull();
    expect((await drop(12, 0, ['a'])).BlendMesh).toBe(0);
    expect((await drop(13, 0, ['a'])).BlendMesh).toBe(1);
  });
});
