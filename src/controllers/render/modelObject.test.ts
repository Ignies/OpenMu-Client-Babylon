import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
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
