import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  KALIMA_BLEND_MESHES,
  KALIMA_EFFECT_ONLY_TYPES,
  KALIMA_EMISSIONS,
} from './spec';

/**
 * Kalima (World25 / Object25) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * Kalima (`WD_24HELLAS … WD_24HELLAS_END` and Kalima 7 = world 36, all on
 * `World25`/`Object25` - `assetWorldNum` in worldAssets.ts). Seven floors of
 * one cave, the floor picked by the server from the Lost Map's level.
 *
 * Most of what the map does at runtime is table data in `spec.ts`: the six
 * hidden emitters, the two crystal flares and the waterfall loop. `create`
 * binds the one family that needs a class - the water plants - and carries
 * the list of what is deliberately not built.
 *
 * Clear colour `(30, 40, 40)/256` is set by `loadMapIntoScene`
 * (SceneManager.cpp:344); music `Music/kalima`, the `aKalima` bed and the
 * `aKalima01`/`02`/`Stone` one-shots are in the sound tables.
 */

// ---- 1. data ---------------------------------------------------------------

// The six Kalima floors and Kalima 7 (world 36): `gMapManager.InHellas()`.
const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_24HELLAS,
  ENUM_WORLD.WD_24HELLAS + 1,
  ENUM_WORLD.WD_24HELLAS + 2,
  ENUM_WORLD.WD_24HELLAS + 3,
  ENUM_WORLD.WD_24HELLAS + 4,
  ENUM_WORLD.WD_24HELLAS_END,
  ENUM_WORLD.WD_24HELLAS_7,
];

// Seven floors of one cave: every one loads `World25` / `Object25`.
const ASSET_WORLD = ENUM_WORLD.WD_24HELLAS + 1;

// World25 has no TileGround01 and Rock01-04 only.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround02',
  'TileGround02',
  'TileGround03',
  'TileWater01',
  'TileWood01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 13, y: 19 } as const;

// SceneManager.cpp:344: a dark teal void behind the cave mouths.
const CLEAR_COLOR = [30, 40, 40] as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const kalimaLayer: MapLayer = {
  name: 'kalima',
  worlds: WORLDS,
  assetWorld: ASSET_WORLD,
  tiles: TILES,
  spawn: SPAWN,
  clearColor: CLEAR_COLOR,
  blendMeshes: KALIMA_BLEND_MESHES,
  effectOnly: KALIMA_EFFECT_ONLY_TYPES,
  emissions: KALIMA_EMISSIONS,
  create: world => import('./create').then(m => m.createKalima(world)),
};
