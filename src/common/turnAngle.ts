/**
 * Angle helpers transcribed from ZzzAI.cpp (`SignedAngleDelta`,
 * `StepTowardsAngle`, `TurnAngle2`, `FarAngle`, `CreateAngle`), in radians.
 * The original runs them once per 25 Hz tick; `approachAngle` converts the
 * per-tick fraction into a frame-rate independent step.
 */
export const REFERENCE_TICK = 1 / 25;

const TWO_PI = Math.PI * 2;

export function normalizeAngle(a: number): number {
  a %= TWO_PI;
  if (a < 0) a += TWO_PI;
  return a;
}

/** Shortest signed delta from → to, in (-π, π]. */
export function signedAngleDelta(from: number, to: number): number {
  let delta = normalizeAngle(to) - normalizeAngle(from);
  if (delta > Math.PI) delta -= TWO_PI;
  else if (delta < -Math.PI) delta += TWO_PI;
  return delta;
}

/** `TurnAngle2`: step `current` towards `target` by at most `maxDelta`. */
export function turnAngle(current: number, target: number, maxDelta: number): number {
  if (maxDelta <= 0) return normalizeAngle(current);
  const d = signedAngleDelta(current, target);
  const clamped = Math.max(-maxDelta, Math.min(maxDelta, d));
  return normalizeAngle(current + clamped);
}

/**
 * The original's `TurnAngle2(a, t, FarAngle(a, t) * k)` — an exponential
 * approach closing `k` of the remaining gap every tick — made frame-rate
 * independent: the same fraction per 25 Hz tick regardless of dt.
 */
export function approachAngle(
  current: number,
  target: number,
  fractionPerTick: number,
  dt: number
): number {
  const ticks = dt / REFERENCE_TICK;
  const keep = Math.pow(1 - fractionPerTick, ticks);
  const d = signedAngleDelta(current, target);
  return normalizeAngle(current + d * (1 - keep));
}

/** `CreateAngle(x1,y1,x2,y2)`: screen-space heading from p1 to p2, degrees in [0,360). */
export function createAngleDeg(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return 0;
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  deg %= 360;
  if (deg < 0) deg += 360;
  return deg;
}

/** The 8-direction byte the server expects for a yaw (`SendRequestAction` rotation). */
export function rotationByteOf(rotYRadians: number): number {
  let deg = ((rotYRadians * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;
  return Math.floor(((deg + 22.5) / 360) * 8 + 1) % 8;
}
