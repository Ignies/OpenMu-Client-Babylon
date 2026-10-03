/**
 * TEMPLATE - copy me to `<name>.ts` and list the layer in `layers.ts`. Never imported.
 * The steps are in readme.md ("Change it").
 */
import type { ENUM_WORLD } from '../../core/types';
import { maps } from '../maps';
import type { WeatherLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds from nothing to full strength. */
const BUILD_SECONDS = 30;

/** Seconds from full strength back to nothing once the cause stops. */
const FADE_SECONDS = 60;

/**
 * Maps this exists on: the ones whose entry asks for it. Add your own field to
 * `MapWeather` (`mapWeather.ts`) and set it in the map's folder; the set is
 * live, so nothing reads the maps at load.
 */
const MAPS: ReadonlySet<ENUM_WORLD> = maps.worldSet(
  layer => layer.weather?.wetGround === true
);

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
