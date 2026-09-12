import type {
  Animation,
  AnimationGroup,
  TargetedAnimation,
} from '../libs/babylon/exports';

/**
 * Clips that hold still.
 *
 * MU's rigs key every bone on every frame of every clip, whether the bone
 * moves or not: a swaying tree animates a few branch tips and writes the same
 * value to its trunk sixty times a second. Babylon runs one Animatable per
 * keyed bone, so the still ones are most of a map's animation work (Noria at
 * the spawn: 2 288 of 2 578 running animations held one value). A still
 * animation is a pose, not a motion: it is written once and taken out of the
 * loop.
 */

const KEY_EPSILON = 1e-6;

type WithEpsilon = {
  equalsWithEpsilon?: (other: unknown, epsilon: number) => boolean;
};

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === 'number') {
    return typeof b === 'number' && Math.abs(a - b) <= KEY_EPSILON;
  }

  const compare = (a as WithEpsilon | null)?.equalsWithEpsilon;

  if (typeof compare === 'function') return compare.call(a, b, KEY_EPSILON);

  return a === b;
}

/** Every key of the animation holds one value. */
export function isStillAnimation(animation: Animation): boolean {
  const keys = animation.getKeys();

  for (let i = 1; i < keys.length; i++) {
    if (!sameValue(keys[0].value, keys[i].value)) return false;
  }

  return true;
}

type Cloneable = { clone?: () => unknown };
type Copyable = { copyFrom?: (value: unknown) => unknown };

/** Write the animation's one value straight onto its target. */
function applyStillValue(targeted: TargetedAnimation): void {
  const keys = targeted.animation.getKeys();

  if (keys.length === 0) return;

  const value: unknown = keys[0].value;
  const path = targeted.animation.targetPropertyPath;
  let owner = targeted.target as Record<string, unknown> | undefined;

  for (let i = 0; i < path.length - 1; i++) {
    owner = owner?.[path[i]] as Record<string, unknown> | undefined;
  }

  if (!owner) return;

  const property = path[path.length - 1];
  const current = owner[property] as Copyable | null | undefined;

  if (current && typeof current.copyFrom === 'function') {
    current.copyFrom(value);
  } else if (typeof (value as Cloneable | null)?.clone === 'function') {
    owner[property] = (value as Required<Cloneable>).clone();
  } else {
    owner[property] = value;
  }
}

/**
 * Take the still animations out of a group. Each is written once now if the
 * group is running, and again whenever the group starts, so a model that
 * hands a bone from one clip to another (a door, a lever) gets its pose
 * written back the way the clip would have. A running group is restarted on
 * its own settings so the Animatables it holds are rebuilt without them.
 *
 * A group that would be left with nothing keeps one still animation: an
 * empty group never starts, and the pose rides on its start. A paused group
 * is left alone. Returns how many went.
 */
export function settleStillAnimations(group: AnimationGroup): number {
  if (group.isStarted && !group.isPlaying) return 0;

  const still = group.targetedAnimations.filter(targeted =>
    isStillAnimation(targeted.animation)
  );

  if (still.length === group.targetedAnimations.length) still.pop();
  if (still.length === 0) return 0;

  const running = group.isStarted;
  const loop = group.loopAnimation;
  const speed = group.speedRatio;

  if (running) group.stop(true);

  for (const targeted of still) group.removeTargetedAnimation(targeted.animation);

  group.onAnimationGroupPlayObservable.add(() => {
    for (const targeted of still) applyStillValue(targeted);
  });

  if (running) group.start(loop, speed, group.from, group.to, group.isAdditive);

  return still.length;
}
