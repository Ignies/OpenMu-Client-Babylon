import { ENUM_WORLD } from '../common/types';
import type { WeatherLayer } from './layer';
import { serverNow } from '../common/serverTime';
import { ambientStrengthAt } from './ambientSchedule';
import { DEVIAS_SNOW } from './ambientWeather';
import { GameOptions } from '../common/gameOptions';
import { SNOW_COVER, terrainOverlaysFor } from '../libs/mu/terrainOverlay';

/**
 * How much settled snow is lying on the ground, 0…1.
 *
 * The falling flakes are particles (`DEVIAS_SNOW`); this is what they leave
 * behind. The original client has no equivalent — `MoveEtcLeaf` settles a leaf
 * on the terrain and fades it out, and that is as far as ground contact ever
 * went ("leaves settling on terrain, and `BITMAP_RAIN_CIRCLE`
 * splashes" are both listed as missing) — so this is our own, and it is
 * deliberately a *simulation* rather than a lookup: cover builds while the
 * squall blows and melts once it passes, which is the whole reason the ground
 * reads as weather rather than as a texture swap.
 *
 * It reads the squall schedule directly rather than being handed the emitter's
 * strength, because the emitter stops when the hero steps indoors and the snow
 * outside plainly does not.
 *
 * Not shared across clients the way the schedule is: two players who arrived at
 * different times can disagree on the exact depth for a minute or two after a
 * squall starts. That is invisible at the thresholds this feeds, and the
 * alternative — integrating the schedule analytically over all of history —
 * buys nothing anyone can see.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * Maps whose GROUND collects snow: the ones `terrainOverlay.ts` draws
 * `SNOW_COVER` on. Everything that sits on the settled snow — caps on the
 * props, prints, the sink underfoot, this accumulator — reads `snowCover()`,
 * and `snowCover()` is 0 off this set, so none of them can outrun the
 * ground they claim to stand on.
 *
 * Not the same set as `SNOW_MAPS` (`ambientWeather.ts`, from
 * `MapLayer.snow`): that is the SKY — flakes fall and rain never does on
 * Ice City, its hatchery and Santa Town too — but those three have no
 * `OVERLAYS_BY_WORLD` row yet, and a snow cap on a bare-ground map is the
 * split-brain this guards against. When a map gets its overlay row it joins
 * here; `updateSnowCover` warns once if the two ever disagree.
 */
export const SNOW_GROUND_MAPS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_2DEVIAS,
]);

/** Seconds of full-strength snowfall to go from bare ground to full cover. */
const BUILD_SECONDS = 90;

/** Seconds to melt from full cover back to the base once the squall passes. */
const MELT_SECONDS = 240;

/**
 * The floor the cover never drops below on a snow map, 0…1.
 *
 * Devias is a snow world: its ground textures are painted snow and the
 * reference frames show a field that is white edge to edge whether or not
 * flakes are in the air. Before this the cover was seeded from the squall
 * alone, so between squalls — and at any squall under full strength — the
 * overlay was patchy and most of the ground was the bare tile texture, which
 * under the blue bake reads as cyan ice. 0.85 with the overlay's headroom
 * (1.25) is past the break-up noise's range, so the snow tiles are solid;
 * the squall still adds the last of the depth on top.
 */
const BASE_COVER = 0.85;

// ---- 2. state + readers ----------------------------------------------------

let cover = 0;
let lastMap: ENUM_WORLD | null = null;

/** Maps already checked against the overlay table (warn once per map). */
const checked = new Set<ENUM_WORLD>();

/** `SNOW_GROUND_MAPS` mirrors the overlay table by hand; say so if it drifts. */
function checkOverlayAgreement(map: ENUM_WORLD): void {
  if (checked.has(map) || !GameOptions.advancedEffects) return;
  checked.add(map);
  const drawn = terrainOverlaysFor(map).includes(SNOW_COVER);
  if (drawn !== SNOW_GROUND_MAPS.has(map)) {
    console.warn(
      `weather/snowCover: SNOW_GROUND_MAPS and terrainOverlay's SNOW_COVER rows disagree on map ${map}`
    );
  }
}

/**
 * Advances the ground cover; call once a frame. Returns the new value.
 *
 * Arriving on a snow map seeds the cover from the squall rather than starting
 * bare: walking into a blizzard over clean ground and waiting ninety seconds
 * for it to whiten looks like a bug, not like weather.
 */
export function updateSnowCover(map: ENUM_WORLD, dt: number): number {
  if (map !== lastMap) checkOverlayAgreement(map);

  if (!SNOW_GROUND_MAPS.has(map)) {
    cover = 0;
    lastMap = map;
    return 0;
  }

  const schedule = DEVIAS_SNOW.schedule;
  const strength = schedule ? ambientStrengthAt(schedule, map, serverNow()) : 0;

  if (map !== lastMap) {
    lastMap = map;
    cover = Math.max(BASE_COVER, Math.min(1, strength));
    return cover;
  }

  if (strength > 0) {
    cover = Math.min(1, cover + (strength * dt) / BUILD_SECONDS);
  } else {
    cover = Math.max(BASE_COVER, cover - dt / MELT_SECONDS);
  }

  return cover;
}

/** Settled snow on the ground, 0…1. */
export function snowCover(): number {
  return cover;
}

/** Drop the cover — a map change that is not to a snow map, or a teardown. */
export function resetSnowCover(): void {
  cover = 0;
  lastMap = null;
}

// ---- 3. the layer ----------------------------------------------------------

/** The layer (see layer.ts). */
export const snowCoverLayer: WeatherLayer = {
  name: 'snowCover',
  maps: SNOW_GROUND_MAPS,
  update: updateSnowCover,
  reset: resetSnowCover,
};
