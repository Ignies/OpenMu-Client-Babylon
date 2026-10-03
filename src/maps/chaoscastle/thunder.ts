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
 * each), and drops a bolt on it out of the sky (`fallingBoltPath`).
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
 * Which of `visible` pillars in view a landed roll strikes, or -1 for none:
 * `RangeInt(0, visible - 1)` comes up `k`, and `MoveChaosCastleObject`
 * counts down to flag the `k`-th pillar it walks, so a zero strikes nothing.
 */
export function thunderPillar(
  visible: number,
  random: () => number = Math.random
): number {
  if (visible <= 0) return -1;
  return Math.floor(random() * visible) - 1;
}

/** MU units per tile. */
const MU = 100;

/** `Position[2] += 800.f`: how high over the pillar the bolt starts. */
export const BOLT_DROP_MU = 800;

/** `MaxTails = 50`: the last five go to closing in on the pillar. */
const BOLT_POINTS = 50;
const BOLT_FALL_STEPS = BOLT_POINTS - 5;

/** `Position[2] -= 16.f` a step, with `rand()%20 - 10` either way on the ground. */
const BOLT_STEP_MU = 16;
const BOLT_WANDER_MU = 10;

/** The segments `fallingBoltPath` lays: `MaxTails` points. */
export const BOLT_SEGMENTS = BOLT_POINTS - 1;

type Point = { x: number; y: number; z: number };

/**
 * `BITMAP_JOINT_THUNDER + 1` SubType 2, laid again every tick
 * (ZzzEffectJoint.cpp:5097-5131): from `from`, high over the pillar, 45
 * steps straight down that wander on the ground, then four steps of a fifth
 * of what is left to `to` each, then `to`. Writes `BOLT_SEGMENTS + 1` points.
 */
export function fallingBoltPath(
  from: Point,
  to: Point,
  out: number[],
  random: () => number = Math.random
): void {
  const wander = () => (Math.floor(random() * 20) - BOLT_WANDER_MU) / MU;
  let x = from.x;
  let y = from.y;
  let z = from.z;
  let k = 0;
  const put = () => {
    out[k * 3] = x;
    out[k * 3 + 1] = y;
    out[k * 3 + 2] = z;
    k++;
  };

  for (let i = 0; i < BOLT_FALL_STEPS; i++) {
    x += wander();
    z += wander();
    y -= BOLT_STEP_MU / MU;
    put();
  }

  const dx = (to.x - x) * 0.2;
  const dy = (to.y - y) * 0.2;
  const dz = (to.z - z) * 0.2;

  for (let i = BOLT_FALL_STEPS; i < BOLT_POINTS - 1; i++) {
    x += dx + wander();
    y += dy;
    z += dz + wander();
    put();
  }

  x = to.x;
  y = to.y;
  z = to.z;
  put();
}

/** `SOUND_CHAOS_THUNDER01 + RangeInt(0, 1)`. */
export function thunderSound(random: () => number = Math.random): Sounds {
  return THUNDER_SOUNDS[random() < 0.5 ? 0 : 1];
}
