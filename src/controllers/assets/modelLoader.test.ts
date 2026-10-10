import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
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

/** What the glTF loader hands back: a root and one mesh with geometry, outside the scene. */
function parse(name: string): AssetContainer {
  const c = new AssetContainer(scene);
  const root = new Mesh('__root__', scene);
  const body = CreateBox('node_0', { size: 1 }, scene);
  body.parent = root;
  for (const m of [root, body]) {
    scene.removeMesh(m);
    c.meshes.push(m);
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
