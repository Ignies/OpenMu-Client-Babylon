/**
 * TEMPLATE — copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every effect file has the same three parts, in this order:
 *
 *   1. Tuning constants at the top, each with a comment saying what it is in
 *      real units (seconds, tiles, 0…1) and why it has that value.
 *   2. Module state + the functions that read it. State lives here, not in
 *      the facade, and readers are plain functions (`fooStrength()`).
 *   3. The exported `WeatherLayer` at the bottom, wiring `update` / `reset`.
 *
 * If the effect touches the ground, add a `TerrainOverlay` recipe in
 * `libs/mu/terrainOverlay.ts` whose `coverage` reads this file's reader.
 * If it falls from the sky, add an `AmbientRecipe` in `ambientWeather.ts`.
 * If it makes a sound, add a bed row in `../sound/ambientBeds.ts`.
 */
import { ENUM_WORLD } from '../common/types';
import type { WeatherLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds from nothing to full strength. */
const BUILD_SECONDS = 30;

/** Seconds from full strength back to nothing once the cause stops. */
const FADE_SECONDS = 60;

/** Maps this exists on. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_0LORENCIA]);

// ---- 2. state + readers ----------------------------------------------------

let strength = 0;

/** How much of the effect is present right now, 0…1. */
export function templateStrength(): number {
  return strength;
}

function update(map: ENUM_WORLD, dt: number): void {
  if (!MAPS.has(map)) {
    strength = 0;
    return;
  }

  // Replace with whatever drives this effect: a packet, a schedule, a map.
  const active = false;

  strength = active
    ? Math.min(1, strength + dt / BUILD_SECONDS)
    : Math.max(0, strength - dt / FADE_SECONDS);
}

function reset(): void {
  strength = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: WeatherLayer = {
  name: 'template',
  maps: MAPS,
  update,
  reset,
};
