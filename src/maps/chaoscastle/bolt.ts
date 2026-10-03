import { Vector3, type Scene } from '../../libs/babylon/exports';
import type { Entity } from '../../ecs/world';
import { effects } from '../../effects';
import { bonePos } from '../../effects/core';
import { TEX } from '../../effects/recipes';
import { BOLT_DROP_MU, BOLT_SEGMENTS, fallingBoltPath } from './thunder';

/** `b->TransformPosition(BoneTransform[1], …)`: the bolt lands on bone 1. */
const PILLAR_BONE = 1;

/** Where the bone is taken from while the pillar model is still loading. */
const PILLAR_FALLBACK_HEIGHT = 2;

/** `LifeTime = 20` ticks. */
const BOLT_SECONDS = 20 * 0.04;

/** The last four ticks fade (`Light /= 1.2` each, ZzzEffectJoint.cpp:5133). */
const BOLT_FADE = 4 / 20;

/** One tick: the walk is laid again every tick. */
const BOLT_REROLL_SECONDS = 0.04;

const rand = (n: number) => Math.floor(Math.random() * n);

/**
 * The bolt a struck pillar takes (CSChaosCastle.cpp:531-534):
 * `CreateJoint(BITMAP_JOINT_THUNDER + 1, Position, Position, Angle, 2, NULL,
 * 60 + rand()%10)` at the pillar's bone 1 - a `JOINT_THUNDER` ribbon 60-69 cm
 * wide that falls from 800 MU over it, white.
 */
export function strikePillar(scene: Scene, pillar: Entity): void {
  const to = bonePos(
    pillar,
    PILLAR_BONE,
    new Vector3(),
    PILLAR_FALLBACK_HEIGHT
  );
  const from = to.clone();

  // `Position[0..1] += rand()%10 - 5`, `Position[2] += 800`.
  from.x += (rand(10) - 5) / 100;
  from.z += (rand(10) - 5) / 100;
  from.y += BOLT_DROP_MU / 100;

  effects.spawn('joint', scene, from, {
    to,
    colour: [1, 1, 1],
    seconds: BOLT_SECONDS,
    fadeTail: BOLT_FADE,
    width: (60 + rand(10)) / 100,
    segments: BOLT_SEGMENTS,
    path: (a, b, out) => fallingBoltPath(a, b, out),
    reroll: BOLT_REROLL_SECONDS,
    texture: TEX.jointThunder,
    textureRepeats: 2,
    textureScroll: 1,
  });
}
