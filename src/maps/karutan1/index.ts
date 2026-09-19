import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  KARUTAN_BLEND_MESHES,
  KARUTAN_EFFECT_ONLY_TYPES,
  KARUTAN_EMISSIONS,
} from './spec';

/**
 * Karutan 1 (World81 / Object81) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 *
 * Karutan 1 (`WD_80KARUTAN1`, `World81`/`Object81`) - the desert.
 *
 * `CGMKarutan1::MoveObject` (GMKarutan1.cpp:36-59) is the five hidden vent
 * types and the fire light, all in `spec.ts` (shared with Karutan 2), and
 * `RenderAfterObjectMesh` (:286-342) is the eleven redrawn types, whose
 * animated part is `KARUTAN_MESH_ANIMATION`. The two per-object rates are
 * the loader's, not the map class's - `create.ts`.
 *
 * Sound (SceneManager.cpp:943-946, `ASG_ADD_MAP_KARUTAN`):
 * `Karutan_desert_env` is the bed; `PlayObjectSound` (:345-354) adds
 * `Karutan_insect_env` on 58 (×4) and 66 (×6) - `sound/objectLoops.ts`.
 * `Music/Karutan_A`.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_80KARUTAN1,
];

// Slot 12 is `AlphaTile01.Tga` on the two Karutan maps (MapManager.cpp:1433-1441,
// ASG_ADD_MAP_KARUTAN); Rock06 stands in, and never draws - see CUTOUT.
const TILES = FULL_TILES;

// `RenderFace` (ZzzLodTerrain.cpp:1284-1292) puts slot 12 through
// `EnableAlphaTest` on both Karutan maps and every other slot through
// `DisableAlphaBlend`, and `World81/AlphaTile01.OZT` is zero in every byte:
// the 45 tiles of EncTerrain81.map that name it draw no ground at all. They
// are the gaps the Kardamahal walkways and the canyon spans cross.
const CUTOUT = 12;

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 125, y: 124 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// Desert, the same climate flag Tarkan carries: no rain whatever the weather
// byte says. Karutan is not one of the seven maps `CreateRain` names, its
// bed is `Karutan_desert_env` and its sky profile is `DESERT_SKY`
// (lighting/profiles.ts:186).
const DESERT = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const karutan1Layer: MapLayer = {
  name: 'karutan1',
  worlds: WORLDS,
  tiles: TILES,
  cutoutTile: CUTOUT,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  desert: DESERT,
  blendMeshes: KARUTAN_BLEND_MESHES,
  effectOnly: KARUTAN_EFFECT_ONLY_TYPES,
  emissions: KARUTAN_EMISSIONS,
  create: world => import('./create').then(m => m.createKarutan1(world)),
};
