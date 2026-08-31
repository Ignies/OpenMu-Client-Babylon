import type { WeatherLayer } from './layer';
import { isTileOpen } from '../libs/mu/terrainMask';
import {
  PUDDLES,
  WET_GROUND,
  overlayAmountAt,
} from '../libs/mu/terrainOverlay';
import type { World } from '../ecs/world';

/**
 * Whether there is standing water under a point — the CPU's view of the
 * `PUDDLES` terrain layer, for the footprints.
 *
 * The wet-boot mechanic (`footprintSystem.ts`) is: step in a puddle, the
 * sole is charged; each print spends some of it; the trail dims and stops.
 * Its first cut asked `puddleCover() > 0.3` — *are there puddles on this
 * map* — so once the streets had pooled the boot recharged on every outdoor
 * step and never dried. A puddle is a patch, not a state, and this asks
 * about the patch: the same break-up noise, slope test and threshold the
 * shader paints with, so the boot gets wet where the eye sees water.
 *
 * Owned here, read through `weather.puddleUnderfoot`.
 */

// ---- 1. tuning ---------------------------------------------------------

/** How far either side of the point the ground slope is measured, in tiles. */
const SLOPE_SPAN = 0.5;

/**
 * How much of a puddle's charge wet-but-not-pooled ground gives the boot.
 * Under the 0.5 that `footprintSystem` treats as a full soak, so wet ground
 * only ever part-charges: prints at about half strength, gone in ~5 steps.
 */
const DAMP_SHARE = 0.45;

// ---- 2. readers --------------------------------------------------------

/**
 * How much puddle is drawn under world (x, z), 0…1. Zero indoors, on a
 * slope, before the rain has pooled, and outside the noise patches.
 */
export function puddleUnderfoot(world: World, x: number, z: number): number {
  const open = isTileOpen(x, z);
  if (!open) return 0;

  // The ground's normal Y from four height samples, standing in for the
  // per-tile facet normal the shader tests. The layer only holds within a
  // few degrees of level, so this only has to tell "flat" from "not".
  const hx0 = world.getTerrainHeight(x - SLOPE_SPAN, z);
  const hx1 = world.getTerrainHeight(x + SLOPE_SPAN, z);
  const hz0 = world.getTerrainHeight(x, z - SLOPE_SPAN);
  const hz1 = world.getTerrainHeight(x, z + SLOPE_SPAN);

  if (hx0 <= -9000 || hx1 <= -9000 || hz0 <= -9000 || hz1 <= -9000) return 0;

  const gx = (hx1 - hx0) / (2 * SLOPE_SPAN);
  const gz = (hz1 - hz0) / (2 * SLOPE_SPAN);
  const normalY = 1 / Math.sqrt(1 + gx * gx + gz * gz);

  // A puddle soaks the boot. Rain-darkened ground short of a puddle only
  // dampens it: the trail is there in the rain, dimmer, and dries sooner.
  // Without this the streets had to pool before a single print showed -
  // and the pooling is slow, patchy, and absent from the bridge, where
  // "characters leave no footprints" was reported.
  return Math.max(
    overlayAmountAt(PUDDLES, x, z, normalY, true),
    overlayAmountAt(WET_GROUND, x, z, normalY, true) * DAMP_SHARE
  );
}

// ---- 3. the layer ------------------------------------------------------

/** Nothing to advance or reset: the cover it reads is owned by `wetnessLayer`. */
export const puddleUnderfootLayer: WeatherLayer = { name: 'puddleUnderfoot' };
