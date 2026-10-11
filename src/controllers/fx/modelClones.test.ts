import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { Ecs } from '../../ecs/current';
import type { Entity, World } from '../../ecs/world';
import type { LoadedModel } from '../assets/modelLoader';
import { modelLayer, spawnModel } from './model';
import { linkedModelLayer, spawnLinkedModel } from './linkedModel';
import { spiritSwarmLayer, type SpiritSwarmOptions } from './spiritSwarm';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Every load is a fresh clone with a skeleton and a clip, as `instantiateModelsToScene` makes one.
const loads = vi.hoisted(() => ({ make: (): unknown => null, made: [] as unknown[] }));
vi.mock('../assets/modelLoader', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadGLTF: async () => {
    const m = loads.make();
    loads.made.push(m);
    return m;
  },
}));

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  Ecs.world = { scene, mapParent: null, getTerrainHeight: () => 0 } as unknown as World;
  loads.make = (): LoadedModel => {
    const root = new Mesh('model_fake', scene);
    const child = CreateBox('node_0', { size: 1 }, scene);
    child.parent = root;
    const skeleton = new Skeleton('skeleton_fake', 'skeleton_fake', scene);
    new Bone('bone_0', skeleton);
    child.skeleton = skeleton;
    return { mesh: root, skeleton, animationGroups: [new AnimationGroup('clip', scene)] };
  };
});
beforeEach(() => {
  loads.made.length = 0;
});
afterAll(() => {
  modelLayer.reset?.();
  linkedModelLayer.reset?.();
  spiritSwarmLayer.reset?.();
  Ecs.world = null;
  scene.dispose();
  engine.dispose();
});

const flush = () => new Promise(r => setTimeout(r, 0));

/** Nothing of the clone is left in the scene: meshes, skeleton, clips. */
function expectGone(m: unknown): void {
  const model = m as LoadedModel;
  expect(model.mesh.isDisposed()).toBe(true);
  expect(scene.skeletons).not.toContain(model.skeleton);
  for (const g of model.animationGroups) expect(scene.animationGroups).not.toContain(g);
}

describe('an effect model clone', () => {
  it('model: a clone kept for reuse goes whole, skeleton and clips, on a map change', async () => {
    spawnModel(scene, new Vector3(), { model: 'Skill/fake.glb', seconds: 0.1 });
    await flush();
    for (let i = 0; i < 5; i++) modelLayer.update?.(0, 0.04);
    // One that arrives after its spawn ended goes the same way.
    spawnModel(scene, new Vector3(), { model: 'Skill/other.glb', seconds: 0.1 }).stop();
    modelLayer.update?.(0, 0.04);
    await flush();
    modelLayer.reset?.();
    expect(loads.made).toHaveLength(2);
    for (const m of loads.made) expectGone(m);
  });

  it('model: a spawn after one ended reuses its clone, shown once dressed', async () => {
    spawnModel(scene, new Vector3(), { model: 'Skill/again.glb', seconds: 0.1 });
    await flush();
    const clone = loads.made[0] as LoadedModel;
    expect(clone.mesh.isEnabled()).toBe(true);
    for (let i = 0; i < 5; i++) modelLayer.update?.(0, 0.04);
    expect(clone.mesh.isEnabled()).toBe(false);
    spawnModel(scene, new Vector3(), { model: 'Skill/again.glb', seconds: 0.1 });
    await flush();
    expect(loads.made).toHaveLength(1);
    expect(clone.mesh.isEnabled()).toBe(true);
    modelLayer.reset?.();
  });

  it('linkedModel: ending, and arriving after the end, drop the whole clone', async () => {
    const bone = new TransformNode('bone', scene);
    const entity = { modelObject: { gltf: { skeleton: { bones: [null, { getTransformNode: () => bone }] } } } } as unknown as Entity;
    spawnLinkedModel(scene, new Vector3(), { model: 'Effect/fake.glb', entity, bone: 0, seconds: 0.1 });
    await flush();
    for (let i = 0; i < 5; i++) linkedModelLayer.update?.(0, 0.04);
    spawnLinkedModel(scene, new Vector3(), { model: 'Effect/fake.glb', entity, bone: 0, seconds: 0.1 }).stop();
    linkedModelLayer.update?.(0, 0.04);
    await flush();
    expect(loads.made).toHaveLength(2);
    for (const m of loads.made) expectGone(m);
  });

  it('spiritSwarm: a disposed rig takes its skull clones along, loaded or late', async () => {
    const ribbon = { width: 0.2, colour: [1, 1, 1] as const, maxCover: 1, texture: 'Effect/JointLaser01.OZJ', taper: {} };
    const opts: SpiritSwarmOptions = {
      spirits: [{ velocity: 1, heading: new Vector3(1, 0, 0), seek: out => out.setAll(0) }],
      seconds: 1,
      fadeTail: 0.2,
      tails: 2,
      smooth: 1,
      seekRate: 0.1,
      wander: { pitch: 0, yaw: 0 },
      band: { floor: 1, ceiling: 4 },
      body: { ...ribbon, wave: { amplitude: 0, cycles: 1, speed: 1 } },
      wisps: { width: 0.1, waves: [] },
      spine: ribbon,
      skull: { model: 'Skill/fake.glb', scale: 1, aimYaw: 0, rearAt: 0, silhouette: [1, 1, 1], silhouetteCover: 1, sheet: [1, 1, 1], sheetCover: 1, passes: 1 },
    };
    spiritSwarmLayer.spawn(scene, new Vector3(), opts);
    await flush();
    spiritSwarmLayer.reset?.();
    spiritSwarmLayer.spawn(scene, new Vector3(), opts);
    spiritSwarmLayer.reset?.();
    await flush();
    expect(loads.made).toHaveLength(4);
    for (const m of loads.made) expectGone(m);
  });
});
