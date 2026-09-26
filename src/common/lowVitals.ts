/**
 * When a vital bar counts as low, how hard the screen edge burns, how fast
 * it beats, and when the heart is heard. Pure: a bar fill and the player's
 * threshold in, the two numbers the overlay draws with out, so the reaction
 * that writes the CSS variables and the test read one rule.
 *
 * Driven by: `ui/pages/worldPage/components/lowHealthOverlay`.
 * Read by: nothing else - it holds no state.
 */

/** Slider bounds of `lowHealthPercent` / `lowManaPercent`. */
export const LOW_VITAL_MIN_PERCENT = 10;
export const LOW_VITAL_MAX_PERCENT = 50;

/** Where the threshold sits when the option is out of range or missing. */
export const LOW_VITAL_DEFAULT_PERCENT = 30;

/** Edge strength the instant the threshold is crossed: the fade needs a target. */
const FLOOR_STRENGTH = 0.35;

/** The edge starts beating under this share of the threshold. */
const PULSE_SHARE = 0.5;

/** Seconds per beat where the beating starts, and at an empty bar. */
const SLOW_BEAT_SECONDS = 1.2;
const FAST_BEAT_SECONDS = 0.45;

/**
 * Quantisation. The strength feeds an opacity and the beat an
 * `animation-duration`, and a duration that changes on every point of health
 * makes the animation stutter, so both land on steps.
 */
const STRENGTH_STEP = 0.01;
const BEAT_STEP = 0.05;

export type VitalWarning = {
  /** 0 nothing to draw, up to 1 for the full edge. */
  strength: number;
  /** Seconds per beat; 0 while the edge is steady. */
  beatSeconds: number;
};

export const NO_WARNING: VitalWarning = { strength: 0, beatSeconds: 0 };

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

const step = (value: number, size: number): number =>
  Math.round(value / size) * size;

/** The option as a fill share, clamped into the slider's own range. */
export function lowVitalThreshold(percent: number): number {
  if (!Number.isFinite(percent)) return LOW_VITAL_DEFAULT_PERCENT / 100;

  return (
    Math.max(
      LOW_VITAL_MIN_PERCENT,
      Math.min(LOW_VITAL_MAX_PERCENT, percent)
    ) / 100
  );
}

/**
 * `fraction` is the bar's fill, 0..1. An empty bar is death rather than a
 * warning, so it clears the edge - nothing has to be survived any more.
 */
export function vitalWarning(
  fraction: number,
  thresholdPercent: number
): VitalWarning {
  if (!Number.isFinite(fraction) || fraction <= 0) return NO_WARNING;

  const threshold = lowVitalThreshold(thresholdPercent);
  if (fraction >= threshold) return NO_WARNING;

  const depth = clamp01(1 - fraction / threshold);
  const strength = step(
    FLOOR_STRENGTH + (1 - FLOOR_STRENGTH) * depth,
    STRENGTH_STEP
  );

  const beatsFrom = threshold * PULSE_SHARE;
  if (fraction >= beatsFrom) return { strength, beatSeconds: 0 };

  const rush = clamp01(1 - fraction / beatsFrom);
  const beatSeconds = step(
    SLOW_BEAT_SECONDS + (FAST_BEAT_SECONDS - SLOW_BEAT_SECONDS) * rush,
    BEAT_STEP
  );

  return { strength, beatSeconds };
}

/** The life bar share under which the heart is heard. */
const HEARTBEAT_SHARE = 0.2;

/**
 * Whether SOUND_HEART should be beating (`RenderLifeMana`,
 * NewUIMainFrameWindow.cpp:330-334): alive and under a fifth of the bar,
 * whatever the overlay options say.
 */
export function heartbeatDue(life: number, lifeMax: number): boolean {
  return lifeMax > 0 && life > 0 && life / lifeMax < HEARTBEAT_SHARE;
}
