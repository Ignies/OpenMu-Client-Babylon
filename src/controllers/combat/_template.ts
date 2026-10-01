/**
 * TEMPLATE - copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported. The three parts are in combat/readme.md.
 */
import { ENUM_WORLD } from '../../core/types';
import type { CombatLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds the effect lasts once triggered. */
const HOLD_SECONDS = 0.5;

/** Maps this exists on. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_0LORENCIA]);

// ---- 2. state + readers ----------------------------------------------------

let remaining = 0;

/** How much of the effect is left, 0…1. */
export function templateStrength(): number {
  return remaining / HOLD_SECONDS;
}

/** Command: trigger it now. */
export function triggerTemplate(): void {
  remaining = HOLD_SECONDS;
}

function update(map: ENUM_WORLD, dt: number): void {
  if (!MAPS.has(map)) {
    remaining = 0;
    return;
  }
  remaining = Math.max(0, remaining - dt);
}

function reset(): void {
  remaining = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: CombatLayer = {
  name: 'template',
  maps: MAPS,
  update,
  reset,
};
