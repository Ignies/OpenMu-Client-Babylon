import type { AbstractEngine } from './babylon/exports';
import { devQueryNumber } from '../common/devSeams';

/**
 * Render scale: how much of the window the 3D scene is actually drawn at,
 * before the browser scales the canvas back up to fill it.
 *
 * This is the one lever that trades picture sharpness for fill rate, and it
 * is worth having because the two machines this game runs on are limited by
 * different things. On a discrete card at 1600x900 the frame is held up by
 * the work the CPU does per mesh, not by pixels: the cascade cache handed
 * the Lorencia frame a 29 % GPU saving and bought 1.7 % more frames. On an
 * integrated one the pixels *are* the limit, and that is the machine in the
 * slow reports.
 *
 * The HUD is not touched. It is DOM over the canvas, so it keeps its own
 * resolution however far the scene is scaled down - which is the usual
 * reason not to do this, and it does not apply here.
 *
 * One writer: Babylon's hardware scaling level is `1 / scale` of the device
 * ratio it already picked, so this composes with the device ratio rather
 * than replacing it, and `resize` carries it through (`abstractEngine.js`
 * multiplies the level by the change in device ratio instead of recomputing
 * it, so a window moved between monitors keeps the scale).
 */

/** Scales below this stop reading as the same game. */
export const RENDER_SCALE_MIN = 0.5;
export const RENDER_SCALE_MAX = 1;

/**
 * What the slider stops on, native first, so the option is an index like
 * every other slider in the window rather than a percentage to drag through.
 * Measured at the Lorencia spawn on an integrated Radeon 610M, the machine
 * behind the slow reports: 15 fps at 1, 25 at 0.75, 29 at 0.6. The same
 * sweep on a discrete card moved nothing outside the run-to-run spread,
 * which is the whole reason this is the player's choice and not a default.
 */
export const RENDER_SCALE_STEPS: readonly number[] = [1, 0.9, 0.8, 0.75, 0.6, 0.5];

export const RENDER_SCALE_STEP_MAX = RENDER_SCALE_STEPS.length - 1;

export function renderScaleForStep(step: number): number {
  const i = Math.round(step);

  return RENDER_SCALE_STEPS[
    Math.min(RENDER_SCALE_STEP_MAX, Math.max(0, Number.isFinite(i) ? i : 0))
  ];
}

/** `?scale=0.75` for the A/B; the option is what players get. */
export function renderScaleSeam(): number | null {
  const dev = devQueryNumber('scale');

  return dev !== null ? clampRenderScale(dev) : null;
}

export function clampRenderScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;

  return Math.min(RENDER_SCALE_MAX, Math.max(RENDER_SCALE_MIN, scale));
}

/**
 * The scale currently applied, so a change is a ratio on the level Babylon
 * is holding rather than a number computed from scratch. Anything else that
 * moves the level (a device-ratio change on resize) is preserved.
 */
let applied = 1;

export function renderScale(): number {
  return applied;
}

export function applyRenderScale(engine: AbstractEngine, scale: number): void {
  const want = clampRenderScale(scale);

  if (want === applied) return;

  engine.setHardwareScalingLevel(
    engine.getHardwareScalingLevel() * (applied / want)
  );

  applied = want;
}

/** Test seam: forget what was applied, without touching an engine. */
export function resetRenderScale(): void {
  applied = 1;
}
