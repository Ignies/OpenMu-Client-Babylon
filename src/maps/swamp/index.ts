import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { ROCK04_TILES } from '../recipes';
import {
  SWAMP_BLEND_MESHES,
  SWAMP_EFFECT_ONLY_TYPES,
  SWAMP_EMISSIONS,
} from './spec';

/**
 * Swamp of Calmness (World57 / Object57) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Swamp of Calmness (`WD_56MAP_SWAMP_OF_QUIET`, `World57`/`Object57`).
 *
 * Every behaviour is table data in `spec.ts`: the seven hidden vents and the
 * brazier light.
 *
 * Not built: `RenderBaseSmoke` (GMSwampOfQuiet.cpp:37-49) — two full-screen
 * scrolling `BITMAP_CHROME+2/+3` layers tinted `(0.4, 0.4, 0.45)`, the same
 * screen-space overlay Tarkan's sandstorm is. That is the map's defining
 * look and it belongs to the post/mood lane; a `swamp` mood row with dense
 * green-grey fog is the closest the grade can get (listed in the report).
 *
 * `PlayObjectSound` is commented out in the source; no world bed either.
 * `Music/SwampOfCalmness`.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET,
];

// World57: Rock01-04 only.
const TILES = ROCK04_TILES;

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 138, y: 108 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const swampLayer: MapLayer = {
  name: 'swamp',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: SWAMP_BLEND_MESHES,
  effectOnly: SWAMP_EFFECT_ONLY_TYPES,
  emissions: SWAMP_EMISSIONS,
};
