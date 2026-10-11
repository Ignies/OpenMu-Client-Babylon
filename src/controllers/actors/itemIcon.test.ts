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
import { ITEM_ICON_SCALE } from '../interface/item_icons';

const loaded: string[] = [];
vi.mock('../assets/modelLoader', async orig => ({
  ...(await orig<object>()),
  loadGLTF: async (path: string, world: { scene: Scene }) => {
    loaded.push(path);
    const root = new Mesh(path, world.scene);
    new Mesh('mesh0', world.scene).parent = root;
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

  it('has no shot for an item with no model (Gladiator\'s Glory, 13/95)', () => {
    expect(itemIconJob(scene, { group: 13, num: 95, lvl: 0 })).toBeNull();
  });
});
