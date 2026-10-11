import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { Node } from '@babylonjs/core/node';
import type { World } from '../../ecs/world';
import { evictUnusedContainers, loadGLTF, syncMaterialQuality } from './modelLoader';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
vi.mock('./compressedAssets', async orig => ({
  ...(await orig<object>()),
  fetchAsset: async () => ({ bytes: new Uint8Array(4), fromSidecar: false }),
}));

let engine: NullEngine;
let scene: Scene;
let world: World;
/** Paths parsed so far: a second parse of one means its cached model was dropped. */
const parsed: string[] = [];

/** What the glTF loader hands back: a root and one mesh with geometry, outside the scene; `Rig*` files carry clips. */
function parse(name: string): AssetContainer {
  const c = new AssetContainer(scene);
  const root = new Mesh('__root__', scene);
  const body = CreateBox('node_0', { size: 1 }, scene);
  body.parent = root;
  // Two nodes one path apart from each other cannot be told apart: every clip is cloned at once.
  if (name.startsWith('RigTwins')) CreateBox('node_0', { size: 1 }, scene).parent = root;
  for (const m of [root, ...root.getChildMeshes(false)]) {
    scene.removeMesh(m);
    c.meshes.push(m);
  }
  if (name.startsWith('Rig')) {
    for (let i = 0; i < 3; i++) {
      const sway = new Animation(`sway${i}`, 'position.x', 25, Animation.ANIMATIONTYPE_FLOAT);
      sway.setKeys([{ frame: 0, value: 0 }, { frame: 10, value: i + 1 }]);
      const clip = new AnimationGroup(`clip${i}`, scene);
      clip.addTargetedAnimation(sway, body);
      scene.removeAnimationGroup(clip);
      c.animationGroups.push(clip);
    }
  }
  const geometry = body.geometry;
  if (geometry) {
    scene.removeGeometry(geometry);
    c.geometries.push(geometry);
  }
  parsed.push(name);
  return c;
}

beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  world = { scene } as unknown as World;
  vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockImplementation((async (_root: string, file: File) => parse(file.name)) as never);
});
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

const LATER = 11_000;
const count = (name: string) => parsed.filter(p => p === name).length;

describe('loadGLTF clips', () => {
  it('clones only the clip it plays at load; another one on first read, onto the clone node', async () => {
    const before = scene.animationGroups.length;
    const model = await loadGLTF('Monster/Rig01.glb', world);
    expect(model.animationGroups.length).toBe(3);
    expect(scene.animationGroups.length - before).toBe(1);
    expect(model.animationGroups[0]?.isPlaying).toBe(true);
    const body = model.mesh.getChildMeshes(false)[0] as Node;
    expect(model.animationGroups[2]?.targetedAnimations[0].target).toBe(body);
    expect(scene.animationGroups.length - before).toBe(2);
  });

  it('clones every clip at load when the clone nodes cannot be matched by name', async () => {
    const before = scene.animationGroups.length;
    await loadGLTF('Monster/RigTwins01.glb', world);
    expect(scene.animationGroups.length - before).toBe(3);
  });
});

describe('syncMaterialQuality', () => {
  it('drops the draw cache of a skinned mesh, so its next frame compiles for the material it is on now', () => {
    const skinned = CreateBox('skinned', { size: 1 }, scene);
    skinned.skeleton = new Skeleton('skeleton', 'skeleton', scene);
    const plain = CreateBox('plain', { size: 1 }, scene);
    const reset = [vi.spyOn(skinned, 'resetDrawCache'), vi.spyOn(plain, 'resetDrawCache')];
    syncMaterialQuality(scene);
    expect(reset.map(r => r.mock.calls.length > 0)).toEqual([true, false]);
    skinned.dispose();
    plain.dispose();
  });
});

describe('evictUnusedContainers', () => {
  it('drops a monster or NPC model nothing draws any more, and keeps one still drawn', async () => {
    const gone = await loadGLTF('Monster/Monster01.glb', world);
    await loadGLTF('Monster/Monster02.glb', world);
    const npc = await loadGLTF('Npc/Smith01.glb', world);
    gone.mesh.dispose();
    npc.mesh.dispose();
    expect(evictUnusedContainers(['/Monster/', '/Npc/'], performance.now() + LATER)).toBe(2);
    await loadGLTF('Monster/Monster01.glb', world);
    await loadGLTF('Monster/Monster02.glb', world);
    await loadGLTF('Npc/Smith01.glb', world);
    expect([count('Monster01.glb'), count('Monster02.glb'), count('Smith01.glb')]).toEqual([2, 1, 2]);
  });

  it('keeps a model asked for in the last 10 s, and the folders the original keeps loaded', async () => {
    (await loadGLTF('Monster/Monster03.glb', world)).mesh.dispose();
    (await loadGLTF('Item/Sword01.glb', world)).mesh.dispose();
    expect(evictUnusedContainers(['/Monster/', '/Npc/'], performance.now())).toBe(0);
    expect(evictUnusedContainers(['/Monster/', '/Npc/'], performance.now() + LATER)).toBe(1);
    await loadGLTF('Item/Sword01.glb', world);
    expect(count('Sword01.glb')).toBe(1);
  });
});

describe('loadGLTF texture identity', () => {
  it('hands Babylon each model folder as the root, so same-named GLBs in two folders never share a texture', async () => {
    const roots: string[] = [];
    const spy = vi.mocked(SceneLoader.LoadAssetContainerAsync);
    const before = spy.mock.calls.length;
    await loadGLTF('Object74/Object98.glb', world);
    await loadGLTF('Object75/Object98.glb', world);
    for (const call of spy.mock.calls.slice(before)) roots.push(call[0] as string);
    expect(roots).toHaveLength(2);
    expect(roots[0]).not.toBe(roots[1]);
    expect(roots[0]).toMatch(/Object74\/$/);
    expect(roots[1]).toMatch(/Object75\/$/);
  });
});
