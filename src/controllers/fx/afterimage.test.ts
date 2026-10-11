import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { toRenderAngles } from '../render/renderAngles';
import { afterimageLayer, type AfterimageBody, type AfterimageHandle } from './afterimage';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterAll(() => {
  afterimageLayer.reset?.();
  scene.dispose();
  engine.dispose();
});

/** The pose clip's first key on bone 1: a quarter turn about z. */
const POSE = Quaternion.RotationAxis(new Vector3(0, 0, 1), Math.PI / 2);
const POSE_CLIP = 1;

/**
 * A two-bone rig like PlayerObject's: a mesh-less body node whose skeleton is linked to its bone nodes, clip 0 standing
 * still and clip 1 turning bone 1, and two parts whose skinned meshes ride the body's skeleton (LinkParent).
 */
function makeBody(): { body: AfterimageBody; parts: AfterimageBody[]; meshes: Mesh[] } {
  const node = new TransformNode('body', scene);
  node.position.set(10, 0, 20);
  node.rotation.set(0, 1, 0);
  const rig = new TransformNode('rig', scene);
  rig.parent = node;
  const n0 = new TransformNode('bone_0', scene);
  n0.parent = rig;
  n0.rotationQuaternion = Quaternion.Identity();
  const n1 = new TransformNode('bone_1', scene);
  n1.parent = n0;
  n1.position.set(0, 1, 0);
  n1.rotationQuaternion = Quaternion.Identity();
  const skeleton = new Skeleton('rig', 'rig', scene);
  new Bone('bone_0', skeleton, null).linkTransformNode(n0);
  new Bone('bone_1', skeleton, skeleton.bones[0]).linkTransformNode(n1);
  const still = new AnimationGroup('clip0', scene);
  const turn = new Animation('turn', 'rotationQuaternion', 24, Animation.ANIMATIONTYPE_QUATERNION);
  turn.setKeys([
    { frame: 0, value: POSE },
    { frame: 1, value: Quaternion.Identity() },
  ]);
  const posed = new AnimationGroup('clip1', scene);
  posed.addTargetedAnimation(turn, n1);
  const body = { node, gltf: { mesh: rig as never, skeleton, animationGroups: [still, posed] } };
  const meshes: Mesh[] = [];
  const parts = ['armor', 'boots'].map(name => {
    const partNode = new TransformNode(`${name}Node`, scene);
    partNode.parent = node;
    const root = new Mesh(`${name}Root`, scene);
    root.parent = partNode;
    root.scaling.set(1, -1, 1);
    const mesh = CreateBox(name, { size: 0.5 }, scene);
    mesh.parent = root;
    mesh.position.set(0, 0.5, 0);
    mesh.skeleton = skeleton;
    meshes.push(mesh);
    const hidden = CreateBox(`${name}Hidden`, { size: 0.5 }, scene);
    hidden.parent = root;
    hidden.isVisible = false;
    return { node: partNode, gltf: { mesh: root, skeleton, animationGroups: [] } };
  });
  return { body, parts, meshes };
}

const clonesOf = (name: string): Mesh[] => scene.meshes.filter(m => m.name === `${name}_afterimage`) as Mesh[];

describe('afterimage: a still copy of a body\'s parts on a clip\'s first key, each part placed by its spawner', () => {
  it('copies the drawn meshes of each part onto a skeleton of its own, posed on the clip\'s first key', () => {
    const { body, parts } = makeBody();
    const h = afterimageLayer.spawn(scene, Vector3.Zero(), { body, parts, clip: POSE_CLIP, seconds: 1 }) as AfterimageHandle;
    expect(h.parts).toBe(2);
    const [armor] = clonesOf('armor');
    expect(armor).toBeDefined();
    expect(clonesOf('armorHidden')).toEqual([]);
    const skeleton = armor.skeleton as Skeleton;
    expect(skeleton).not.toBe(body.gltf?.skeleton);
    expect(clonesOf('boots')[0].skeleton).toBe(skeleton);
    // The copy's bone stands on the key; the body's own bone is still linked to its node and untouched.
    expect(skeleton.bones[1].getTransformNode()).toBeNull();
    expect(Quaternion.Dot(skeleton.bones[1].rotationQuaternion, POSE)).toBeCloseTo(1, 5);
    expect(body.gltf?.skeleton.bones[1].getTransformNode()?.rotationQuaternion?.equals(Quaternion.Identity())).toBe(true);
    h.stop();
    afterimageLayer.update?.(0, 0);
  });

  it('a part placed at an angle stands there turned as a body facing that way is drawn, at its alpha', () => {
    const { body, parts, meshes } = makeBody();
    const h = afterimageLayer.spawn(scene, Vector3.Zero(), { body, parts, clip: POSE_CLIP, seconds: 1 }) as AfterimageHandle;
    const at = new Vector3(3, 0.2, 4);
    h.place(0, at, 90, 0.4);
    const [armor] = clonesOf('armor');
    // Where the part's mesh would sit on a body standing at `at` facing 90 degrees (renderSystem's toRenderAngles).
    body.node.position.copyFrom(at);
    toRenderAngles(new Vector3(0, Math.PI / 2, 0), body.node.rotation);
    const expected = meshes[0].computeWorldMatrix(true).getTranslation();
    expect(armor.computeWorldMatrix(true).getTranslation().subtract(expected).length()).toBeLessThan(1e-5);
    expect(armor.isEnabled()).toBe(true);
    expect(armor.visibility).toBeCloseTo(0.4);
    // Boots were not placed: not drawn.
    expect(clonesOf('boots')[0].isEnabled()).toBe(false);
    h.place(0, at, 90, 0);
    expect(armor.isEnabled()).toBe(false);
    h.place(0, at, 90, 1);
    h.hide();
    expect(armor.isEnabled()).toBe(false);
    h.stop();
    afterimageLayer.update?.(0, 0);
  });

  it('ends after its seconds and takes its copies and skeleton with it', () => {
    const { body, parts } = makeBody();
    const skeletons = scene.skeletons.length;
    const h = afterimageLayer.spawn(scene, Vector3.Zero(), { body, parts, clip: POSE_CLIP, seconds: 0.1 });
    expect(scene.skeletons.length).toBe(skeletons + 1);
    afterimageLayer.update?.(0, 0.05);
    expect(h.alive).toBe(true);
    afterimageLayer.update?.(0, 0.05);
    expect(h.alive).toBe(false);
    expect(clonesOf('armor').filter(m => !m.isDisposed())).toEqual([]);
    expect(scene.skeletons.length).toBe(skeletons);
  });

  it('a body with nothing loaded copies nothing', () => {
    const h = afterimageLayer.spawn(scene, Vector3.Zero(), { body: { node: new TransformNode('empty', scene), gltf: null }, parts: [], clip: 0, seconds: 1 }) as AfterimageHandle;
    expect(h.alive).toBe(false);
    expect(h.parts).toBe(0);
    h.place(0, Vector3.Zero(), 0, 1);
  });
});
