import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  CURSED_TEMPLE_BLEND_MESHES,
  CURSED_TEMPLE_EFFECT_ONLY_TYPES,
  CURSED_TEMPLE_EMISSIONS,
} from './spec';

/**
 * Illusion Temple (World47 / Object47) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Illusion Temple (`WD_45CURSEDTEMPLE_LV1 … LV6`, all six on
 * `World47`/`Object47`).
 *
 * Outside a match the map is ten hidden markers and three breathing lamps
 * (`spec.ts`, `meshAnimation.ts`). The match itself — the relic, the
 * statues, the score gauge (`m_bGaugebarEnabled`, :330), `cursedtempleplay`
 * replacing `cursedtemplewait` — is server-driven and not built; the waiting
 * music `Music/cursedtemplewait` is what `PlayBGM` starts with.
 *
 * Clear colour `(9, 8, 33)/256` (SceneManager.cpp:356) is set by
 * `loadMapIntoScene`. Offline: `?offline&map=45` lands at OpenMU's spawn gate
 * 142 (98-108 / 128-137).
 */

// ---- 1. data ---------------------------------------------------------------

// The six Illusion Temple levels (`gMapManager.IsCursedTemple()`).
const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_45CURSEDTEMPLE_LV1,
  ENUM_WORLD.WD_45CURSEDTEMPLE_LV2,
  ENUM_WORLD.WD_45CURSEDTEMPLE_LV3,
  ENUM_WORLD.WD_45CURSEDTEMPLE_LV4,
  ENUM_WORLD.WD_45CURSEDTEMPLE_LV5,
  ENUM_WORLD.WD_45CURSEDTEMPLE_LV6,
];

// Every level loads `World47` / `Object47` (`WD_45CURSEDTEMPLE_LV1 + 2`,
// MapManager.cpp:1220).
const ASSET_WORLD = ENUM_WORLD.WD_45CURSEDTEMPLE_LV1 + 2;

// Slot 4 is `AlphaTileGround03.Tga` (MapManager.cpp:1392, `IsCursedTemple()`)
// and there is no Wood01; Ground03 / Ground01 stand in.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround02',
  'TileGround03',
  'TileWater01',
  'TileGround01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
  'TileRock05',
  'TileRock06',
  'TileRock07',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 103, y: 132 } as const;

// SceneManager.cpp:356: deep indigo.
const CLEAR_COLOR = [9, 8, 33] as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const cursedtempleLayer: MapLayer = {
  name: 'cursedtemple',
  worlds: WORLDS,
  assetWorld: ASSET_WORLD,
  tiles: TILES,
  spawn: SPAWN,
  clearColor: CLEAR_COLOR,
  blendMeshes: CURSED_TEMPLE_BLEND_MESHES,
  effectOnly: CURSED_TEMPLE_EFFECT_ONLY_TYPES,
  emissions: CURSED_TEMPLE_EMISSIONS,
};
