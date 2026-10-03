/**
 * TEMPLATE - a copy-me skill layer, never imported. Steps: "Change it" in readme.md.
 */
import type { ENUM_WORLD } from '../../core/types';
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
