/**
 * TEMPLATE — copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every entry file has the same three parts, in this order:
 *
 *   1. Tuning constants at the top, each with a comment saying what it is in
 *      real units (seconds, points, 0…1) and why it has that value.
 *   2. Module state + the functions that read it. State lives here, not in
 *      the facade; readers are plain functions (`fooRemaining()`), commands
 *      are verbs (`startFoo()`).
 *   3. The exported `SkillLayer` at the bottom, wiring `update` / `reset`.
 *
 * Whatever draws the entry (a hotbar overlay, a tooltip, a window) lives in
 * `ui/…` and imports the readers from here or from the `skills` facade.
 */
import type { ENUM_WORLD } from '../common/types';
import type { SkillLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds the effect lasts once started. */
const DURATION_SECONDS = 10;

// ---- 2. state + readers ----------------------------------------------------

let remaining = 0;

/** Seconds left, 0 when idle. */
export function templateRemaining(): number {
  return remaining;
}

/** Start the effect now. */
export function startTemplate(): void {
  remaining = DURATION_SECONDS;
}

function update(_map: ENUM_WORLD, dt: number): void {
  remaining = Math.max(0, remaining - dt);
}

function reset(): void {
  remaining = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: SkillLayer = {
  name: 'template',
  update,
  reset,
};
