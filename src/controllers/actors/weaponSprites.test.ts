import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { ModelObject } from '../render/modelObject';
import { WeaponSprites } from './weaponSprites';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** A weapon model: one mesh and `bones` bones (plus the root) each driven by a node 0.1 apart on x. */
function weapon(bones: number) {
  const root = new Mesh('weapon', scene);
  new Mesh('blade', scene).parent = root;
  const skeleton = new Skeleton('weapon', 'weapon', scene);
  for (let i = 0; i <= bones; i++) {
    const node = new TransformNode(`node${i}`, scene);
    node.parent = root;
    node.position.set(i * 0.1, 0, 0);
    new Bone(`bone${i}`, skeleton).linkTransformNode(node);
  }
  const object = new ModelObject(scene);
  object.load({ mesh: root, skeleton, animationGroups: [] as AnimationGroup[] });
  return object;
}

const look = () => ({ scale: 0, r: 0, g: 0, b: 0, rotation: 0 });

describe('a held weapon\'s sprites (RenderLinkObject, ZzzCharacter.cpp:7027-8386)', () => {
  it('ride the bone a sprite names, at its point in the bone\'s frame (cm)', () => {
    const object = weapon(4);
    const sprites = new WeaponSprites(scene, object, [
      { texture: 'flare01', bone: 2, offset: [5, -22, -10], scale: 1, light: [1, 1, 1] },
      { texture: 'flare01', bone: 0, scale: 1, light: [1, 1, 1] },
    ]);
    const [offset, plain] = sprites.nodes;
    expect(offset.parent?.name).toBe('node3'); // BoneTransform[2]: skeleton bone 3, after the root
    expect(plain.parent?.name).toBe('node1');
    const p = offset.getAbsolutePosition();
    expect([p.x, p.y, p.z].map(n => +n.toFixed(4))).toEqual([0.35, -0.22, -0.1]);
  });

  it('read their scale, light and rotation each frame, from WorldTime and the wearer\'s light', () => {
    const object = weapon(1);
    const sprites = new WeaponSprites(scene, object, [
      {
        texture: 'lightmarks',
        bone: 1,
        scale: ms => ms / 1000,
        light: (ms, body, out) => out.set(body.x, ms / 1000, 0),
        rotation: ms => ms * 0.36,
      },
      { texture: 'flare01', bone: 1, scale: 0.6, light: [0.8, 0.6, 0.2] },
    ]);
    sprites.update(500, new Vector3(0.25, 1, 1), true);
    const a = look();
    sprites.look(0, a);
    expect(a).toEqual({ scale: 0.5, r: 0.25, g: 0.5, b: 0, rotation: 180 });
    const b = look();
    sprites.look(1, b);
    expect(b).toEqual({ scale: 0.6, r: 0.8, g: 0.6, b: 0.2, rotation: 0 });
  });

  it('move a point that jitters each frame the weapon is drawn', () => {
    const object = weapon(1);
    const sprites = new WeaponSprites(scene, object, [
      { texture: 'shiny02', bone: 1, offset: (ms, out) => out.set(0, ms / 100, 0), scale: 1, light: [1, 1, 1] },
    ]);
    sprites.update(300, Vector3.One(), true);
    expect(sprites.nodes[0].position.y).toBeCloseTo(0.03);
    object.OutOfView = true;
    sprites.update(900, Vector3.One(), true);
    expect(sprites.nodes[0].position.y).toBeCloseTo(0.03);
  });

  it('fall back on the model\'s root for a model with no skeleton', () => {
    const root = new Mesh('bare', scene);
    new Mesh('blade', scene).parent = root;
    const object = new ModelObject(scene);
    object.load({ mesh: root, skeleton: null as unknown as Skeleton, animationGroups: [] as AnimationGroup[] });
    const sprites = new WeaponSprites(scene, object, [{ texture: 'impact03', bone: 0, scale: 0.75, light: [1, 1, 1] }]);
    expect(sprites.nodes[0].parent).toBe(root);
  });
});

describe('a held sprite gated on its wearer', () => {
  it('draws at size 0 while its test fails (an action, c->SafeZone) and at its scale while it holds', () => {
    const sprites = new WeaponSprites(scene, weapon(1), [
      { texture: 'flare01', bone: 1, scale: 0.8, light: [1, 1, 1], when: w => !w.safeZone && w.action === 7 },
    ]);
    const out = look();
    sprites.update(0, Vector3.One(), true, { action: 7, safeZone: true, yaw: 0, map: 0 });
    sprites.look(0, out);
    expect(out.scale).toBe(0);
    sprites.update(0, Vector3.One(), true, { action: 7, safeZone: false, yaw: 0, map: 0 });
    sprites.look(0, out);
    expect(out.scale).toBe(0.8);
  });
});

describe('a held weapon\'s emitters (CreateParticle, CreateJoint in RenderLinkObject)', () => {
  it('run at their bone\'s world point with the wearer and the frame\'s length while the weapon is drawn', () => {
    const object = weapon(2);
    const calls: [number, number, number, number][] = [];
    const sprites = new WeaponSprites(scene, object, [], [{ bone: 1, emit: (_scene, at, w, dt) => calls.push([+at.x.toFixed(4), w.action, w.yaw, dt]) }]);
    object.node.computeWorldMatrix(true);
    for (const node of scene.transformNodes) node.computeWorldMatrix(true);
    sprites.update(0, Vector3.One(), true, { action: 144, safeZone: false, yaw: 1.5, map: 0 }, 0.04);
    sprites.update(0, Vector3.One(), false, { action: 144, safeZone: false, yaw: 1.5, map: 0 }, 0.04);
    expect(calls).toEqual([[0.2, 144, 1.5, 0.04]]); // bone 1: node 2, 0.2 along x; none while hidden
  });
});
