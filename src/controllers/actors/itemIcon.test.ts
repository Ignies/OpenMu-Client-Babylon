import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { angleMatrixQuaternion } from '../render/renderAngles';
import type { ModelObject } from '../render/modelObject';
import { ITEM_ICON_SCALE } from '../interface/item_icons';

/** The meshes of a converted model, by texture: a Queen helm is the head, the hair and the helm. */
const MESHES: Record<string, string[]> = {
  'Player/HelmMale54.glb': ['Item6001_head', 'Item6001_headhair', 'Item6001_Helm'],
};

const loaded: string[] = [];
vi.mock('../assets/modelLoader', async orig => ({
  ...(await orig<object>()),
  loadGLTF: async (path: string, world: { scene: Scene }) => {
    loaded.push(path);
    const root = new Mesh(path, world.scene);
    for (const name of MESHES[path] ?? ['mesh0']) {
      const mesh = new Mesh(name, world.scene);
      mesh.parent = root;
      mesh.metadata = { skinTexture: /head/i.test(name), diffuseTexture: { name } };
    }
    return { mesh: root, skeleton: new Skeleton(path, path, world.scene), animationGroups: [] };
  },
}));

import { itemIconJob, ITEM_ICON_UNITS_PER_PIXEL } from './itemIcon';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

const DEG = Math.PI / 180;
const M = 1 / 100;

describe('an item icon shot', () => {
  it('covers the item\'s squares as the original\'s item camera sees them', () => {
    // Mace of the King: 1 x 3 squares, 20 bag pixels each (INVENTORY_SQUARE_WIDTH).
    const job = itemIconJob(scene, { group: 2, num: 22, lvl: 0 });
    expect(job?.view.width).toBe(40);
    expect(job?.view.height).toBe(120);
    expect(job?.view.left).toBe(0);
    expect(job?.view.top).toBe(0);
    expect(job?.view.right).toBeCloseTo(20 * ITEM_ICON_UNITS_PER_PIXEL * M, 9);
    expect(job?.view.bottom).toBeCloseTo(-60 * ITEM_ICON_UNITS_PER_PIXEL * M, 9);
  });

  it('a bag pixel at the item depth: 200 units out, a 1 degree view of 480 pixels', () => {
    // RenderObjectScreen puts the item 0.1 of the way to RENDER_ITEMVIEW_FAR (2000).
    expect(ITEM_ICON_UNITS_PER_PIXEL).toBeCloseTo((200 * Math.tan(0.5 * DEG)) / 240, 9);
  });

  it('loads the item\'s own model under the shot\'s root, at its scale', async () => {
    const job = itemIconJob(scene, { group: 14, num: 21, lvl: 0 });
    const root = new TransformNode('root', scene);
    const subject = await job?.build(root);
    expect(loaded.at(-1)).toBe('Item/ConChip00.glb');
    const node = root.getChildren()[0] as TransformNode;
    expect(node.scaling.x).toBeCloseTo(ITEM_ICON_SCALE['14_21'], 9);
    expect(node.position.y).toBeCloseTo(-200 * M, 9);
    subject?.dispose();
    expect(root.getChildren()).toHaveLength(0);
    root.dispose();
  });

  it('turns it by the original\'s angle, as AngleMatrix does', async () => {
    const job = itemIconJob(scene, { group: 14, num: 21, lvl: 0 });
    const root = new TransformNode('root', scene);
    const subject = await job?.build(root);
    const node = root.getChildren()[0] as TransformNode;
    const want = angleMatrixQuaternion(270 * DEG, -10 * DEG, 0, new Quaternion());
    expect(Math.abs(Quaternion.Dot(node.rotationQuaternion ?? new Quaternion(), want))).toBeCloseTo(1, 6);
    subject?.dispose();
    root.dispose();
  });

  it('draws a worn part (the Queen helm, a skinned Player/ model) as the original draws a loose one', async () => {
    const job = itemIconJob(scene, { group: 7, num: 53, lvl: 0 });
    const root = new TransformNode('root', scene);
    const subject = await job?.build(root);
    expect(loaded.at(-1)).toBe('Player/HelmMale54.glb');
    const node = root.getChildren()[0] as TransformNode;
    const model = node.getChildren()[0] as Mesh;
    // HideSkin: the Queen helm draws its helm mesh alone (ZzzObject.cpp:7830).
    expect(model.getChildMeshes().map(mesh => mesh.isVisible)).toEqual([false, false, true]);
    // ItemHeight / BodyHeight -160 brings the head-high part down to its origin (ZzzInventory.cpp:8889).
    expect(model.position.y).toBeCloseTo(-1.6, 9);
    // Its own skeleton, no rig.
    expect(model.getChildMeshes()[2].skeleton).toBeNull();
    subject?.dispose();
    root.dispose();
  });

  it('places the model at the original\'s anchor in the squares plus its offset (the Lucky Penny, 1 x 1)', async () => {
    const job = itemIconJob(scene, { group: 14, num: 100, lvl: 0 });
    const root = new TransformNode('root', scene);
    const subject = await job?.build(root);
    const node = root.getChildren()[0] as TransformNode;
    const unit = ITEM_ICON_UNITS_PER_PIXEL * M;
    // RenderItem3D (0.49, 0.28) of 20 x 20 bag pixels, then Position += (0.01, -0.05) (:8483-8488).
    expect(node.position.x).toBeCloseTo(0.49 * 20 * unit + 0.01 * M, 9);
    expect(node.position.z).toBeCloseTo(-0.28 * 20 * unit - 0.05 * M, 9);
    const want = angleMatrixQuaternion(0, 0, 0, new Quaternion());
    expect(Math.abs(Quaternion.Dot(node.rotationQuaternion ?? new Quaternion(), want))).toBeCloseTo(1, 6);
    subject?.dispose();
    root.dispose();
  });

  it('turns a weapon by its hands (Mace of the King, one-handed)', async () => {
    const job = itemIconJob(scene, { group: 2, num: 22, lvl: 0 });
    const root = new TransformNode('root', scene);
    const subject = await job?.build(root);
    const node = root.getChildren()[0] as TransformNode;
    const want = angleMatrixQuaternion(180 * DEG, 270 * DEG, 15 * DEG, new Quaternion());
    expect(Math.abs(Quaternion.Dot(node.rotationQuaternion ?? new Quaternion(), want))).toBeCloseTo(1, 6);
    subject?.dispose();
    root.dispose();
  });

  it('draws the model the bag swaps in for a level, at its scale (the Heart +0 is MODEL_EVENT)', async () => {
    const job = itemIconJob(scene, { group: 14, num: 12, lvl: 0 });
    const root = new TransformNode('root', scene);
    const subject = await job?.build(root);
    expect(loaded.at(-1)).toBe('Item/Event02.glb');
    expect((root.getChildren()[0] as TransformNode).scaling.x).toBeCloseTo(0.0025, 9);
    subject?.dispose();
    root.dispose();
  });

  it('tints the model by its level and excellence, as RenderPartObject draws a bag item (ZzzInventory.cpp:9699)', async () => {
    const root = new TransformNode('root', scene);
    const plain = (await itemIconJob(scene, { group: 12, num: 26, lvl: 0 })?.build(root)) as ModelObject;
    expect(plain.getMeshes(true).map(mesh => mesh.metadata.itemTier ?? null)).toEqual([null]);
    plain.dispose();
    const bright = (await itemIconJob(scene, { group: 12, num: 26, lvl: 9, isExcellent: true })?.build(root)) as ModelObject;
    const meshes = bright.getMeshes(true);
    expect(meshes.length).toBeGreaterThan(0);
    for (const mesh of meshes) {
      expect(mesh.metadata.itemTier?.level).toBe(9);
      expect(mesh.metadata.itemTier?.isExcellent).toBe(true);
      expect(mesh.metadata.itemLvl).toBe(9);
    }
    bright.dispose();
    root.dispose();
  });

  it('keeps one picture per look: the level and excellence are in the key', () => {
    const keys = [
      itemIconJob(scene, { group: 12, num: 26, lvl: 0 })?.key,
      itemIconJob(scene, { group: 12, num: 26, lvl: 9 })?.key,
      itemIconJob(scene, { group: 12, num: 26, lvl: 9, isExcellent: true })?.key,
    ];
    expect(new Set(keys).size).toBe(3);
  });

  it('has no shot for an item with no model (Gladiator\'s Glory, 13/95)', () => {
    expect(itemIconJob(scene, { group: 13, num: 95, lvl: 0 })).toBeNull();
  });
});
