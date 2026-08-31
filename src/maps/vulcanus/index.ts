import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  VULCANUS_BLEND_MESHES,
  VULCANUS_EFFECT_ONLY_TYPES,
  VULCANUS_EMISSIONS,
} from './spec';

/**
 * Vulcanus / PK Field (World64 / Object64) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Vulcanus, the PK Field (`WD_63PK_FIELD`, `World64`/`Object64`).
 *
 * `CGM_PK_Field::CreateObject` (GM_PK_Field.cpp:230-243) makes types 0-6
 * unpickable (`CollisionRange = -300`) and `MoveObject` hides them — they
 * are the seven vent kinds in `spec.ts`. Nothing else is per-object.
 *
 * This is one of the three `IsTerrainHeightExtMap` worlds (ZzzLodTerrain.cpp
 * :599-602): a 24-bit `TerrainHeight.OZB`, detected by `parseTerrainHeight`.
 * Its slot-11 tile is `Object64song_lava1.jpg` in the original
 * (MapManager.cpp:1424); `getTilesList` uses the folder's `TileWater02`.
 *
 * Not built: `CreateFireSpark` (the leaves slot — embers in the air, a
 * weather recipe), `MoveBlurEffect` on the Volcanic monsters, and the
 * `TileGrass01_R.jpg` additive grass (:1459). `Music/PK_Field`; no bed
 * (`PlayObjectSound` is empty).
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_63PK_FIELD,
];

// Slot 11 is `Object64\\song_lava1.jpg` (MapManager.cpp:1424, `IsPKField() ||
// IsDoppelGanger2()`) — a texture outside the World folder, which the loader
// cannot reach; the folder's own TileWater02 (the lava sheet) is the closest
// thing it has. `EncTerrain64.map` also indexes slot 12 (`TileRock06`, not in
// World64 — unbound in the original); Rock04 stands in so the cells do not
// fall back to Grass01.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround02',
  'TileGround03',
  'TileWater01',
  'TileWood01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
  'TileWater02',
  'TileRock04',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 123, y: 131 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const vulcanusLayer: MapLayer = {
  name: 'vulcanus',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: VULCANUS_BLEND_MESHES,
  effectOnly: VULCANUS_EFFECT_ONLY_TYPES,
  emissions: VULCANUS_EMISSIONS,
};
