/**
 * Deterministic on/off schedule for ambient weather.
 *
 * Leaves and snow used to run at full rate for as long as you stood on the
 * map, which reads as a machine rather than as weather. A schedule turns each
 * recipe into *episodes* — a gust of leaves, a snow squall — separated by calm
 * stretches, and derives every roll from `serverNow()` instead of
 * `Math.random()`, so two clients on the same map see the same gust start at
 * the same second with the same strength.
 *
 * Time is cut into fixed `period` slots. Each slot rolls once: does an episode
 * happen at all (`chance`), how long does it last (`duration`), when inside the
 * slot does it start, and how hard does it blow (`strength`). The episode is
 * clamped inside its own slot, so a strength lookup only ever has to hash the
 * current slot — no history, no state, correct the instant a client joins
 * mid-episode.
 */

export type AmbientSchedule = {
  /** Roll seed. Recipes sharing a key burst together (snow + big flakes). */
  readonly key: string;
  /** Slot length in seconds: at most one episode starts per slot. */
  readonly period: number;
  /** Odds a slot carries an episode at all (0.5 = weather about half the time). */
  readonly chance: number;
  /** Episode length range in seconds (clamped to `period`). */
  readonly duration: readonly [number, number];
  /** Peak strength range, as a multiplier on the recipe's emit rate. */
  readonly strength: readonly [number, number];
  /** Fade in / out at the episode edges, seconds. */
  readonly ramp: number;
};

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** One roll in [0, 1) from (seed, slot, salt) — the same everywhere. */
function roll(seed: number, slot: number, salt: number): number {
  let h = (seed ^ Math.imul(slot, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 0x100000000;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Smoothstep, used for the episode edges. A linear ramp is still a corner:
 * the rate changes slope in one frame at both ends, which is visible as the
 * moment the weather "switches on". Easing the ends removes it.
 */
const smooth = (t: number) => {
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return k * k * (3 - 2 * k);
};

/**
 * Emit-rate multiplier for this schedule at `nowMs` on the shared clock.
 * `salt` separates otherwise identical recipes — pass the map index so the
 * same leaf recipe gusts independently in Lorencia, Noria and Atlans.
 * Returns 0 during the calm between episodes.
 */
export function ambientStrengthAt(
  schedule: AmbientSchedule,
  salt: number,
  nowMs: number
): number {
  const t = nowMs / 1000;
  const slot = Math.floor(t / schedule.period);
  const seed = (hashString(schedule.key) ^ Math.imul(salt + 1, 0x27d4eb2f)) >>> 0;

  if (roll(seed, slot, 1) >= schedule.chance) return 0;

  const span = Math.min(
    schedule.period,
    lerp(schedule.duration[0], schedule.duration[1], roll(seed, slot, 2))
  );
  const start = slot * schedule.period + roll(seed, slot, 3) * (schedule.period - span);
  const into = t - start;
  if (into <= 0 || into >= span) return 0;

  const ramp = Math.min(schedule.ramp, span / 2);
  const envelope =
    ramp > 0 ? smooth(Math.min(1, into / ramp, (span - into) / ramp)) : 1;
  const peak = lerp(schedule.strength[0], schedule.strength[1], roll(seed, slot, 4));

  return peak * envelope;
}
