import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  KARUTAN_BLEND_MESHES,
  KARUTAN_EFFECT_ONLY_TYPES,
  KARUTAN_EMISSIONS,
} from './spec';

/**
 * Karutan 1 (World81 / Object81) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Karutan 1 (`WD_80KARUTAN1`, `World81`/`Object81`) — the desert.
 *
 * `CGMKarutan1::MoveObject` (GMKarutan1.cpp:42-65) is the five hidden vent
 * types and the fire light, all in `spec.ts` (shared with Karutan 2).
 * Nothing is per-object.
 *
 * Sound (SceneManager.cpp:630-645, `ASG_ADD_MAP_KARUTAN`):
 * `Karutan_desert_env` is the bed; `PlayObjectSound` (:349-417) adds
 * `Karutan_insect_env` on 58 (×4) and 66 (×6) — positional loops, hook
 * missing. `Music/Karutan_A`. Slot 12 of the tile set is `AlphaTile01.Tga`
 * in the original (`getTilesList` substitutes Rock06).
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_80KARUTAN1,
];

// Slot 12 is `AlphaTile01.Tga` on the two Karutan maps (MapManager.cpp:1436,
// ASG_ADD_MAP_KARUTAN); Rock06 stands in.
const TILES = FULL_TILES;

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 125, y: 124 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const karutan1Layer: MapLayer = {
  name: 'karutan1',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: KARUTAN_BLEND_MESHES,
  effectOnly: KARUTAN_EFFECT_ONLY_TYPES,
  emissions: KARUTAN_EMISSIONS,
};
