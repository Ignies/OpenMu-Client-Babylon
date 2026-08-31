import type { WeatherLayer } from './layer';
import { GameOptions } from '../common/gameOptions';
import { isTileOpen } from '../libs/mu/terrainMask';
import { snowCover } from './snowCover';

/**
 * Snow lying on the map's objects — barrels, signs, fences, rocks, roofs.
 *
 * The ground overlay whitens the terrain; without this the props standing
 * on it stay bare, and a bare barrel on a white field is the first thing the
 * eye finds wrong. Driven by the same `snowCover` as the ground, so caps and
 * drifts build and melt together, and by the roof mask, so nothing under a
 * ceiling gets a cap.
 *
 * Read by the shared item material (`common/itemMaterial.ts`), which whitens
 * every UP-facing fragment of a mesh flagged `metadata.snowCap` — the flag
 * is set by `MapTileObject` on `SNOW_MAPS`, so characters, items and
 * effects never take one.
 */

// ---- 1. tuning ---------------------------------------------------------

/** Linear RGB of the cap at full depth. The ground overlay's white, unwarmed. */
export const SNOW_CAP_COLOUR: readonly [number, number, number] = [0.97, 0.975, 0.99];

/**
 * Surface normal Y where a cap starts (thin cover) and where it is complete
 * (full cover). Snow settles on anything facing up: at full cover a face
 * tilted 45° (Y 0.7) is white and a wall (Y 0) is bare; a light dusting
 * only reaches the near-flat tops.
 */
export const SNOW_CAP_KNEE_THIN = 0.85;
export const SNOW_CAP_KNEE_FULL = 0.45;

// ---- 2. state + readers -------------------------------------------------

/**
 * How much cap an object standing at tile (x, z) carries, 0…1. Zero under a
 * roof and with advanced effects off — checked here, because this is the
 * one reader the material binds and it is the material that pays.
 */
export function snowCapAt(x: number, z: number): number {
  if (!GameOptions.advancedEffects) return 0;
  const cover = snowCover();
  if (cover <= 0) return 0;
  return isTileOpen(x, z) ? cover : 0;
}

// ---- 3. the layer -------------------------------------------------------

/** Nothing to advance or reset: the cover it reads is owned by `snowCoverLayer`. */
export const snowCapsLayer: WeatherLayer = { name: 'snowCaps' };
