import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
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

  it('stops the clip 0 the loader started when the first action is not clip 0', () => {
    const object = new ModelObject(scene);
    const gltf = rig();
    // loadGLTF plays clip 0; a player rig starts with CurrentAction at another action (PlayerObject).
    gltf.animationGroups[0]?.play(true);
    object.load(gltf);
    object.CurrentAction = 1;
    object.playAction(2);
    expect(gltf.animationGroups[0]?.isStarted).toBe(false);
    expect(gltf.animationGroups[2]?.isStarted).toBe(true);
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

describe('the Classic blob shadow', () => {
  /** A 2-tile box under its own root, named so its shadow clone can be found. */
  function box(name: string) {
    const root = new Mesh(name, scene);
    CreateBox(`${name}_body`, { size: 2 }, scene).parent = root;
    return { mesh: root, skeleton: new Skeleton(name, name, scene), animationGroups: [] as AnimationGroup[] };
  }
  const shadowed = (name: string) => scene.getMeshByName(`${name}_shadow0`) !== null;

  it('is cast by a character, and by a map object only when the original shadows it (ZzzObject.cpp:1041-1057)', () => {
    const character = new ModelObject(scene);
    character.load(box('character'));

    const scenery = new ModelObject(scene);
    scenery.IsMapObject = true;
    scenery.load(box('scenery'));

    const statue = new ModelObject(scene);
    statue.IsMapObject = true;
    statue.MapShadow = true;
    statue.load(box('statue'));

    expect([shadowed('character'), shadowed('scenery'), shadowed('statue')]).toEqual([true, false, true]);
  });

  // RenderBodyShadow's mesh range: only those meshes cast (the Dark Horse's, ZzzObject.cpp:790).
  it('takes only the meshes it names into the shadow', () => {
    const horse = new ModelObject(scene);
    horse.ShadowMeshes = [1];
    const gltf = body(3);
    for (const mesh of gltf.mesh.getChildMeshes()) mesh.metadata = {};
    horse.load(gltf);
    expect(gltf.mesh.getChildMeshes().map(mesh => mesh.metadata.shadowSkip === true)).toEqual([true, false, true]);
  });

  // BodyOrigin set to the terrain height before RenderBodyShadow (ZzzObject.cpp:1050-1053, GOBoid.cpp:1594-1596).
  it('folds from the ground under the object when it asks to', () => {
    const boid = new ModelObject(scene);
    boid.ShadowFromGround = true;
    boid.load(box('boid'));
    const plain = new ModelObject(scene);
    plain.load(box('plain'));
    const fromGround = (name: string) => scene.getMeshByName(`${name}_shadow0`)?.metadata?.shadowFromGround;
    expect([fromGround('boid'), fromGround('plain')]).toEqual([true, false]);
  });
});
