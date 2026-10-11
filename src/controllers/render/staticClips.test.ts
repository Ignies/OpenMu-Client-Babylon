import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { isStillAnimation, settleStillAnimations } from './staticClips';

function vector3Clip(name: string, property: string, values: Vector3[]): Animation {
  const animation = new Animation(
    name,
    property,
    30,
    Animation.ANIMATIONTYPE_VECTOR3,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );

  animation.setKeys(values.map((value, i) => ({ frame: i * 10, value })));

  return animation;
}

function quaternionClip(name: string, values: Quaternion[]): Animation {
  const animation = new Animation(
    name,
    'rotationQuaternion',
    30,
    Animation.ANIMATIONTYPE_QUATERNION,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );

  animation.setKeys(values.map((value, i) => ({ frame: i * 10, value })));

  return animation;
}

describe('staticClips', () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    engine.dispose();
  });

  it('tells a still animation from a moving one', () => {
    const still = vector3Clip('s', 'position', [
      new Vector3(1, 2, 3),
      new Vector3(1, 2, 3),
      new Vector3(1, 2, 3),
    ]);
    const moving = vector3Clip('m', 'position', [
      new Vector3(1, 2, 3),
      new Vector3(1, 2.5, 3),
    ]);
    const single = vector3Clip('one', 'position', [new Vector3(4, 5, 6)]);

    expect(isStillAnimation(still)).toBe(true);
    expect(isStillAnimation(moving)).toBe(false);
    expect(isStillAnimation(single)).toBe(true);
  });

  it('writes the still pose once and keeps only what moves in a running group', () => {
    const trunk = new TransformNode('trunk', scene);
    const tip = new TransformNode('tip', scene);
    trunk.rotationQuaternion = Quaternion.Identity();

    const group = new AnimationGroup('sway', scene);
    group.addTargetedAnimation(
      vector3Clip('trunkPos', 'position', [new Vector3(0, 7, 0), new Vector3(0, 7, 0)]),
      trunk
    );
    group.addTargetedAnimation(
      quaternionClip('trunkRot', [
        Quaternion.FromEulerAngles(0, 0.5, 0),
        Quaternion.FromEulerAngles(0, 0.5, 0),
      ]),
      trunk
    );
    group.addTargetedAnimation(
      vector3Clip('tipPos', 'position', [new Vector3(0, 9, 0), new Vector3(0.2, 9, 0)]),
      tip
    );
    group.start(true, 1.5);

    expect(group.animatables.length).toBe(3);

    const removed = settleStillAnimations(group);

    expect(removed).toBe(2);
    expect(group.targetedAnimations.length).toBe(1);
    expect(group.targetedAnimations[0].target).toBe(tip);
    expect(group.isStarted).toBe(true);
    expect(group.loopAnimation).toBe(true);
    expect(group.speedRatio).toBe(1.5);
    expect(group.animatables.length).toBe(1);

    expect(trunk.position.equalsWithEpsilon(new Vector3(0, 7, 0))).toBe(true);
    expect(
      trunk.rotationQuaternion!.equalsWithEpsilon(
        Quaternion.FromEulerAngles(0, 0.5, 0)
      )
    ).toBe(true);
  });

  it('writes the pose on every later start and keeps one animation so the group can', () => {
    const node = new TransformNode('n', scene);
    const group = new AnimationGroup('pose', scene);
    group.addTargetedAnimation(
      vector3Clip('pos', 'position', [new Vector3(3, 3, 3), new Vector3(3, 3, 3)]),
      node
    );
    group.addTargetedAnimation(
      vector3Clip('scale', 'scaling', [new Vector3(2, 2, 2), new Vector3(2, 2, 2)]),
      node
    );

    // Not running: one still animation goes, nothing is written yet.
    expect(settleStillAnimations(group)).toBe(1);
    expect(node.position.equalsWithEpsilon(Vector3.Zero())).toBe(true);
    expect(group.targetedAnimations.length).toBe(1);

    // Another clip moved the node; starting this one writes its pose back.
    node.position.set(9, 9, 9);
    group.start(true);
    expect(group.isStarted).toBe(true);
    expect(node.position.equalsWithEpsilon(new Vector3(3, 3, 3))).toBe(true);

    // A clip that holds still all the way through keeps its one animation.
    const running = new AnimationGroup('runningPose', scene);
    const other = new TransformNode('o', scene);
    running.addTargetedAnimation(
      vector3Clip('pos', 'position', [new Vector3(5, 5, 5), new Vector3(5, 5, 5)]),
      other
    );
    running.start(true);
    expect(settleStillAnimations(running)).toBe(0);
    expect(running.targetedAnimations.length).toBe(1);
    expect(running.isStarted).toBe(true);
  });

  it('leaves a paused group alone', () => {
    const node = new TransformNode('n', scene);
    const group = new AnimationGroup('frozen', scene);
    group.addTargetedAnimation(
      vector3Clip('pos', 'position', [new Vector3(3, 3, 3), new Vector3(3, 3, 3)]),
      node
    );
    group.start(true);
    group.pause();

    expect(settleStillAnimations(group)).toBe(0);
    expect(group.targetedAnimations.length).toBe(1);
  });
});
