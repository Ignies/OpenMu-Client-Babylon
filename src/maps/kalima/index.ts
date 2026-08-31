import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  KALIMA_BLEND_MESHES,
  KALIMA_EFFECT_ONLY_TYPES,
  KALIMA_EMISSIONS,
} from './spec';

/**
 * Kalima (World25 / Object25) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Kalima (`WD_24HELLAS … WD_24HELLAS_END` and Kalima 7 = world 36, all on
 * `World25`/`Object25` — `assetWorldNum` in worldAssets.ts). Seven floors of
 * one cave, the floor picked by the server from the Lost Map's level.
 *
 * Everything the map does at runtime is table data in `spec.ts`: the six
 * hidden emitters and the two crystal flares. What is *not* built:
 *
 *  - **`CheckGrass`** (GMHellas.cpp:400-425) — types 15, 29 (×287) and 32 are
 *    water plants that lean away from the hero as they walk through, then
 *    settle at 0.6 decay, and are pinned to `GetWaterTerrain() + 180`. The
 *    same shape as Lost Tower's `CheckSkull`, and portable the same way; not
 *    done here because there is no water-height field in the clone for the
 *    pin, and the lean alone reads as jitter.
 *  - **The hero-relative motes** (`MoveHellasObjectSetting`, :305-355): one
 *    `BITMAP_LIGHT` SubType 7 per 1-in-5 tick within ±4 tiles of the hero,
 *    and the falling stone (`CreateEffect(9)` + `aKalimaStone`) one in 75.
 *    The stone's *sound* is in `sound/ambientBeds.ts` as a one-shot; the
 *    motes are a weather-layer recipe once a hero-relative one exists.
 *  - The `AmbientSoundInterval` one-shots (`aKalima01`/`02` every 4 s) and
 *    Kundun's roar in the boss room (25-51 × 44-119) — the first is in
 *    `ambientBeds.ts`, the second needs the floor number the server sends.
 *
 * Clear colour `(30, 40, 40)/256` is set by `loadMapIntoScene`
 * (SceneManager.cpp:344); music `Music/kalima` and the `aKalima` bed are in
 * the sound tables.
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
};
