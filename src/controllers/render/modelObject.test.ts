import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { lazyAnimationGroups } from '../assets/lazyAnimationGroups';
import { ModelObject } from './modelObject';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** A model whose clips are cloned on first read, as loadGLTF hands a rig out. */
function rig() {
  const root = new Mesh('rig', scene);
  const body = new Mesh('node_0', scene);
  body.parent = root;
  const sources = [0, 1, 2].map(i => {
    const sway = new Animation(`sway${i}`, 'position.x', 25, Animation.ANIMATIONTYPE_FLOAT);
    // Clip i spans i + 2 key steps.
    sway.setKeys(Array.from({ length: i + 3 }, (_, k) => ({ frame: 5 * k, value: k % 2 })));
    const clip = new AnimationGroup(`clip${i}`, scene);
    clip.addTargetedAnimation(sway, body);
    return clip;
  });
  const groups = lazyAnimationGroups(sources, source => source.clone(`${source.name}:copy`));
  return { mesh: root, skeleton: new Skeleton('rig', 'rig', scene), animationGroups: groups };
}

describe('a model whose clips are cloned on first play', () => {
  it('reads every clip\'s keys at load and sets up a clip cloned later', () => {
    const object = new ModelObject(scene);
    const gltf = rig();
    object.load(gltf);
    // A clip's length does not need its clone.
    expect(object.getActionDuration(2)).toBeGreaterThan(object.getActionDuration(0));
    expect([...gltf.animationGroups]).toHaveLength(0);

    object.playAction(2, false);
    const clip = gltf.animationGroups[2];
    clip?.onAnimationGroupEndObservable.notifyObservers(clip);
    expect(object.ActionIterationWasFinished).toBe(true);
  });
});

const at = (seconds: number) => ({ TotalGameTime: { TotalSeconds: seconds } }) as Parameters<ModelObject['Update']>[0];

/** A model with `count` plain meshes and a skeleton of `bones` bones, each driven by a node. */
function body(count: number, bones = 0) {
  const root = new Mesh('body', scene);
  for (let i = 0; i < count; i++) new Mesh(`mesh${i}`, scene).parent = root;
  const skeleton = new Skeleton('body', 'body', scene);
  for (let i = 0; i < bones; i++) new Bone(`bone${i}`, skeleton).linkTransformNode(new TransformNode(`node${i}`, scene));
  return { mesh: root, skeleton, animationGroups: [] as AnimationGroup[] };
}

describe('a blend mesh', () => {
  it('BlendMesh -2 draws every mesh additive (ZzzBMD.cpp:2022 `BlendMesh <= -2`)', () => {
    const object = new ModelObject(scene);
    object.BlendMesh = -2;
    const gltf = body(3);
    object.load(gltf);
    for (const mesh of gltf.mesh.getChildMeshes()) expect(mesh.metadata.brightMesh).toBe(true);
  });

  it('re-reads BlendMeshLight every frame off WorldTime when it pulses', () => {
    const object = new ModelObject(scene);
    object.BlendMesh = 1;
    object.BlendMeshLightAt = ms => ms / 1000;
    const gltf = body(2);
    object.load(gltf);
    object.Update(at(0.25));
    const [plain, blend] = gltf.mesh.getChildMeshes();
    expect(blend.metadata.blendMeshLight).toBeCloseTo(0.25);
    expect(plain.metadata.blendMeshLight).toBeUndefined();
  });
});

describe('a part linked to a bone', () => {
  it('goes back under its owner when unlinked (setBoneLink(-1)), not posed by the bone it left', () => {
    const owner = new ModelObject(scene);
    owner.load(body(0, 40));
    const part = new ModelObject(scene, owner.node);
    part.setParent(owner);
    part.load(body(1));

    part.setBoneLink(33);
    part.Update(at(0));
    expect(part.node.parent === owner.node).toBe(false);

    part.setBoneLink(-1);
    expect(part.node.parent === owner.node).toBe(true);
    expect(part.node.position.length()).toBe(0);
    expect(part.node.rotationQuaternion === null).toBe(true);
    expect(part.node.scaling.asArray()).toEqual([1, 1, 1]);
  });
});
