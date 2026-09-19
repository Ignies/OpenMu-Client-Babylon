import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  KARUTAN_BLEND_MESHES,
  KARUTAN_EFFECT_ONLY_TYPES,
  KARUTAN_EMISSIONS,
} from '../karutan1/spec';

/**
 * Karutan 2 (World82 / Object82) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 *
 * Karutan 2 (`WD_81KARUTAN2`, `World82`/`Object82`) - Kardamahal's canyon.
 *
 * Every `CGMKarutan1` hook tests `IsKarutanMap()` (GMKarutan1.cpp:876-879),
 * which is both worlds, and the two object sets are the same models under
 * the same type numbers, so the tables live in `maps/karutan1/spec.ts` and
 * are registered for this world from there.
 *
 * Sound (SceneManager.cpp:947-958): the desert bed everywhere except on tile
 * 12, where it is swapped for `Kardamahal_entrance_env` - two beds with
 * opposite `mutedOn` gates in `ambientBeds.ts`. `Music/Karutan_B`.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_81KARUTAN2,
];

// Slot 12 is `AlphaTile01.Tga` (MapManager.cpp:1433-1441); Rock06 stands in,
// and never draws - see CUTOUT.
const TILES = FULL_TILES;

// `RenderFace` (ZzzLodTerrain.cpp:1284-1292) alpha-tests slot 12 alone, and
// `World82/AlphaTile01.OZT` is zero in every byte: the 148 tiles of
// EncTerrain82.map that name it draw no ground. The same slot the
// `Kardamahal_entrance_env` bed gates on (`HeroTile == 12`), which is the
// canyon floor under the fortress approach.
const CUTOUT = 12;

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 162, y: 16 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// Desert, as Karutan 1 and Tarkan are: no rain whatever the weather byte
// says. Same bed, same `DESERT_SKY` profile (lighting/profiles.ts:186).
const DESERT = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const karutan2Layer: MapLayer = {
  name: 'karutan2',
  worlds: WORLDS,
  tiles: TILES,
  cutoutTile: CUTOUT,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  desert: DESERT,
  // Both Karutan maps share one object set: the Karutan 1 tables.
  blendMeshes: KARUTAN_BLEND_MESHES,
  effectOnly: KARUTAN_EFFECT_ONLY_TYPES,
  emissions: KARUTAN_EMISSIONS,
  create: world => import('./create').then(m => m.createKarutan2(world)),
};
