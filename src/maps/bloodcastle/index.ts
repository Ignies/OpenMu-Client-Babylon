import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  BLOOD_CASTLE_BLEND_MESHES,
  BLOOD_CASTLE_EFFECT_ONLY_TYPES,
  BLOOD_CASTLE_EMISSIONS,
} from './spec';

/**
 * Blood Castle (World12 / Object12) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

// The seven Blood Castle floors and the master-level castle: eight server
// instances on one art set (`gMapManager.InBloodCastle()`, MapManager.cpp:1564).
const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_11BLOODCASTLE1,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 1,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 2,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 3,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 4,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 5,
  ENUM_WORLD.WD_11BLOODCASTLE_END,
  ENUM_WORLD.WD_52BLOODCASTLE_MASTER_LEVEL,
];

// Every floor loads `World12` / `Object12` (MapManager.cpp:1206-1225).
const ASSET_WORLD = ENUM_WORLD.WD_11BLOODCASTLE1 + 1;

// World12 has no TileGround01: slot 2 stands in with Ground02.
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

// The safe strip at the south end of the bridge approach.
const SPAWN = { x: 14, y: 12 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const bloodcastleLayer: MapLayer = {
  name: 'bloodcastle',
  worlds: WORLDS,
  assetWorld: ASSET_WORLD,
  tiles: TILES,
  spawn: SPAWN,
  blendMeshes: BLOOD_CASTLE_BLEND_MESHES,
  effectOnly: BLOOD_CASTLE_EFFECT_ONLY_TYPES,
  emissions: BLOOD_CASTLE_EMISSIONS,
  create: world => import('./create').then(m => m.createBloodCastle(world)),
};
