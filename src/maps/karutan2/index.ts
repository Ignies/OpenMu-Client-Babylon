import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  KARUTAN_BLEND_MESHES,
  KARUTAN_EFFECT_ONLY_TYPES,
  KARUTAN_EMISSIONS,
} from '../karutan1/spec';

/**
 * Karutan 2 (World82 / Object82) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Karutan 2 (`WD_81KARUTAN2`, `World82`/`Object82`) — Kardamahal's canyon.
 *
 * Same `CGMKarutan1::MoveObject` as Karutan 1; tables in
 * `maps/karutan1/spec.ts`, registered for this world from there.
 *
 * Sound (SceneManager.cpp:636-645): the desert bed everywhere except on tile
 * 12, where it is swapped for `Kardamahal_entrance_env` — two beds with
 * opposite `mutedOn` gates in `ambientBeds.ts`. `Music/Karutan_B`.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_81KARUTAN2,
];

// Slot 12 is `AlphaTile01.Tga` (MapManager.cpp:1436); Rock06 stands in.
const TILES = FULL_TILES;

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 162, y: 16 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const karutan2Layer: MapLayer = {
  name: 'karutan2',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  // Both Karutan maps share one object set: the Karutan 1 tables.
  blendMeshes: KARUTAN_BLEND_MESHES,
  effectOnly: KARUTAN_EFFECT_ONLY_TYPES,
  emissions: KARUTAN_EMISSIONS,
};
