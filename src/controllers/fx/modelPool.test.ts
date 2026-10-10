import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { LoadedModel } from '../assets/modelLoader';
import { POOL_PER_MODEL, clearModelPool, returnModel, spareModelCount, takeModel } from './modelPool';

let engine: NullEngine;
let scene: Scene;
beforeEach(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterEach(() => {
  clearModelPool();
  engine.dispose();
});

function fakeModel(on = scene): LoadedModel {
  const root = new Mesh('model_fake', on);
  const part = CreateBox('node_0', { size: 1 }, on);
  part.parent = root;
  part.material = new StandardMaterial('own', on);
  part.metadata = { diffuseTexture: 'sheet' };
  return { mesh: root, skeleton: null as never, animationGroups: [new AnimationGroup('clip', on)] };
}

describe('the effect model pool', () => {
  it('hands a returned clone out again as it was loaded, disabled until the spawn has dressed it', async () => {
    let loads = 0;
    const load = async () => {
      loads++;
      return fakeModel();
    };
    const first = await takeModel(scene, 'fx.glb', load);
    // A fresh load too: a clone never shows as the raw GLB.
    expect(first.mesh.isEnabled()).toBe(false);
    const part = first.mesh.getChildMeshes(false)[0];
    const original = part.material;

    // What a spawn does to it.
    const holder = new TransformNode('fxModel', scene);
    first.mesh.setParent(holder);
    first.mesh.setEnabled(true);
    part.material = new StandardMaterial('additive', scene);
    part.metadata.brightMesh = true;
    part.isVisible = false;
    part.visibility = 0.3;
    part.alwaysSelectAsActiveMesh = true;
    const shine = (part as Mesh).clone('node_0:shine', part.parent);
    first.animationGroups[0].onAnimationGroupEndObservable.add(() => {});

    returnModel(first);
    holder.dispose(false, false);
    expect(first.mesh.isDisposed()).toBe(false);
    expect(shine.isDisposed()).toBe(true);
    expect(spareModelCount()).toBe(1);

    const again = await takeModel(scene, 'fx.glb', load);
    expect(again).toBe(first);
    expect(loads).toBe(1);
    expect(part.material).toBe(original);
    expect(part.metadata).toEqual({ diffuseTexture: 'sheet' });
    expect(part.isVisible).toBe(true);
    expect(part.visibility).toBe(1);
    expect(part.alwaysSelectAsActiveMesh).toBe(false);
    expect(again.mesh.parent).toBeNull();
    expect(again.mesh.isEnabled()).toBe(false);
    expect(again.animationGroups[0].onAnimationGroupEndObservable.hasObservers()).toBe(false);
  });

  it('keeps a bounded number per model and disposes the rest', async () => {
    const taken: LoadedModel[] = [];
    for (let i = 0; i < POOL_PER_MODEL + 3; i++) taken.push(await takeModel(scene, 'fx.glb', async () => fakeModel()));
    for (const model of taken) returnModel(model);
    expect(spareModelCount()).toBe(POOL_PER_MODEL);
    expect(taken.filter(m => m.mesh.isDisposed())).toHaveLength(3);
  });

  it('disposes a clone that was not taken from it, and empties on a map change', async () => {
    const stray = fakeModel();
    returnModel(stray);
    expect(stray.mesh.isDisposed()).toBe(true);
    const kept = await takeModel(scene, 'fx.glb', async () => fakeModel());
    returnModel(kept);
    clearModelPool();
    expect(spareModelCount()).toBe(0);
    expect(kept.mesh.isDisposed()).toBe(true);
  });

  it('never hands a clone to another scene', async () => {
    const other = new Scene(engine);
    returnModel(await takeModel(scene, 'fx.glb', async () => fakeModel()));
    const there = await takeModel(other, 'fx.glb', async () => fakeModel(other));
    expect(there.mesh.getScene()).toBe(other);
  });
});
