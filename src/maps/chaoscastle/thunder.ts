import type { Sounds } from '../../sound/recipes';

/**
 * The lightning pillars' thunder, the plain-data half: pure timing, no scene.
 *
 * `MoveChaosCastleObjectSetting` (CSChaosCastle.cpp:169-178) rolls
 * `rand_fps_check(10)` every 25 fps frame, in and out of a match, and on a
 * hit draws `objCount` from `[0, visible - 1]`, where `visible` is how many
 * type-3 pillars were on screen last frame. `MoveChaosCastleObject`
 * (:194-218) then walks the visible pillars and flags the `objCount`-th, so
 * a zero strikes nothing. The flagged pillar fires `eElec1` or `eElec2`
 * once, unpositioned (:523-540; ZzzOpenData.cpp:4872-4873, one channel
 * each).
 *
 * Rather than roll every frame, the next landed roll is scheduled from the
 * same rate, and the zero draw is taken when it lands.
 */

/** The pillar type (`o->Type == 3`). */
export const PILLAR_TYPE = 3;

/** `rand_fps_check(10)` at 25 fps: rolls that land per second. */
const ROLLS_PER_SECOND = 25 / 10;

export const THUNDER_SOUNDS: readonly Sounds[] = ['Sound/eElec1', 'Sound/eElec2'];

/** Seconds until the next landed roll: exponential at the roll rate. */
export function nextThunderSeconds(random: () => number = Math.random): number {
  return -Math.log(1 - random()) / ROLLS_PER_SECOND;
}

/**
 * Whether a landed roll strikes a pillar, with `visible` pillars in view:
 * `RangeInt(0, visible - 1)` must not come up zero.
 */
export function thunderStrikes(
  visible: number,
  random: () => number = Math.random
): boolean {
  if (visible <= 0) return false;
  return Math.floor(random() * visible) !== 0;
}

/** `SOUND_CHAOS_THUNDER01 + RangeInt(0, 1)`. */
export function thunderSound(random: () => number = Math.random): Sounds {
  return THUNDER_SOUNDS[random() < 0.5 ? 0 : 1];
}
