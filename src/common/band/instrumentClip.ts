import { Animation, AnimationGroup, Quaternion, Vector3 } from '../../libs/babylon/exports';
import type { ModelObject } from '../modelObject';

/**
 * The instrument clips: frames copied out of an existing emote. The rig has
 * no instrument animations and its clip table is full, but a few keys of
 * the right emote - the end of Again, the start of Hustle - are a player
 * holding an instrument; looped there and back they are a player playing
 * one. The copy is made per model instance the first time it is needed and
 * appended to that model's animation groups, so it plays like any clip.
 *
 * A pose is a hold, not a step of the dance the frames came from, so the
 * copy is tamed on the way in: every bone keeps the position of the first
 * frame (the emote's root travel is what read as the body lunging at the
 * guitar), the hips and legs keep its rotation too, and what is left - the
 * spine, arms and head - goes only `sway` of the way toward the last frame.
 *
 * `from` / `to` are fractions of the source clip.
 */

/** Keyed by the loaded rig, not the ModelObject: a reload brings a fresh clip table. */
const cache = new WeakMap<object, Map<string, number>>();

/**
 * Bones held rigid, by the rig's Biped names: the root (`bone_0_Bip01`), its
 * footsteps helper, the pelvis and both legs, and the mesh dummies that ride
 * the root.
 */
const HELD_BONE = /Bip01( Footsteps| Pelvis| [LR] (Thigh|Calf|Foot|Toe\d*))?$|Mesh\d+$|_gfh$/;

export function instrumentClip(model: ModelObject, source: number, from: number, to: number, sway = 1): number | null {
  const gltf = model.gltf;
  if (!gltf) return null;
  const key = `${source}:${from}:${to}:${sway}`;
  let clips = cache.get(gltf);
  if (!clips) {
    clips = new Map();
    cache.set(gltf, clips);
  }
  const known = clips.get(key);
  if (known !== undefined) return known;

  const src = gltf.animationGroups[source];
  const first = src?.targetedAnimations[0];
  if (!src || !first) return null;

  const f0 = src.from + from * (src.to - src.from);
  const f1 = src.from + to * (src.to - src.from);
  const span = Math.max(0.5, f1 - f0);
  const group = new AnimationGroup(`instrument_${key}`, first.target.getScene());

  for (const ta of src.targetedAnimations) {
    const anim = ta.animation;
    const base = cloneValue(anim.evaluate(f0));
    const held = anim.targetProperty === 'position' || HELD_BONE.test(ta.target.name ?? '');
    const tame = (value: unknown): unknown => (held ? cloneValue(base) : swayToward(base, value, sway));
    const inside = anim
      .getKeys()
      .filter(k => k.frame > f0 && k.frame < f1)
      .map(k => ({ frame: k.frame - f0, value: tame(k.value) }));
    const forward = [
      { frame: 0, value: cloneValue(base) },
      ...inside,
      { frame: span, value: tame(anim.evaluate(f1)) },
    ];
    // There and back: the loop closes on itself with no jump.
    const back = forward
      .slice(1, -1)
      .reverse()
      .map(k => ({ frame: 2 * span - k.frame, value: cloneValue(k.value) }));
    const copy = new Animation(anim.name, anim.targetProperty, anim.framePerSecond, anim.dataType, Animation.ANIMATIONLOOPMODE_CYCLE);
    copy.setKeys([...forward, ...back, { frame: 2 * span, value: cloneValue(forward[0].value) }]);
    group.addTargetedAnimation(copy, ta.target);
  }

  const index = gltf.animationGroups.push(group) - 1;
  clips.set(key, index);
  return index;
}

/** `value` pulled back toward `base`: a rotation by slerp, a vector by lerp, anything else as it is. */
function swayToward(base: unknown, value: unknown, t: number): unknown {
  if (t >= 1) return cloneValue(value);
  if (base instanceof Quaternion && value instanceof Quaternion) return Quaternion.Slerp(base, value, t);
  if (base instanceof Vector3 && value instanceof Vector3) return Vector3.Lerp(base, value, t);
  return cloneValue(value);
}

function cloneValue<T>(value: T): T {
  const v = value as { clone?: () => T };
  return typeof v?.clone === 'function' ? v.clone() : value;
}
