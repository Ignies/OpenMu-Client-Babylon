/**
 * TEMPLATE — copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every combat entry has the same three parts, in this order:
 *
 *   1. Tuning constants at the top, each in real units (seconds, tiles,
 *      reference ticks at 25 Hz, 0…1) with a comment saying why.
 *   2. Module state + the functions that read or command it. State lives
 *      here, not in the facade; readers are plain functions.
 *   3. The exported `CombatLayer` at the bottom, wiring `update` / `reset`.
 *
 * If the entry needs a packet sent, it exposes a *command* that the ECS
 * consumer (`attackSystem.ts`, `skillCastSystem.ts`) calls — the entry
 * itself never imports `Store` to send. If it needs a clip, add the row to
 * `recipes.ts`.
 */
import { ENUM_WORLD } from '../common/types';
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
