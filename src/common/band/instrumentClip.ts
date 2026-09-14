import { Animation, AnimationGroup } from '../../libs/babylon/exports';
import type { ModelObject } from '../modelObject';

/**
 * The instrument clips: frames copied out of an existing emote. The rig has
 * no instrument animations and its clip table is full, but a few keys of
 * the right emote - the end of Again, the start of Hustle - are a player
 * holding an instrument; looped there and back they are a player playing
 * one. The copy is made per model instance the first time it is needed and
 * appended to that model's animation groups, so it plays like any clip.
 *
 * `from` / `to` are fractions of the source clip.
 */

/** Keyed by the loaded rig, not the ModelObject: a reload brings a fresh clip table. */
const cache = new WeakMap<object, Map<string, number>>();

export function instrumentClip(model: ModelObject, source: number, from: number, to: number): number | null {
  const gltf = model.gltf;
  if (!gltf) return null;
  const key = `${source}:${from}:${to}`;
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
    const inside = anim
      .getKeys()
      .filter(k => k.frame > f0 && k.frame < f1)
      .map(k => ({ frame: k.frame - f0, value: cloneValue(k.value) }));
    const forward = [
      { frame: 0, value: cloneValue(anim.evaluate(f0)) },
      ...inside,
      { frame: span, value: cloneValue(anim.evaluate(f1)) },
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

function cloneValue<T>(value: T): T {
  const v = value as { clone?: () => T };
  return typeof v?.clone === 'function' ? v.clone() : value;
}
