import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  ELBELAND_BLEND_MESHES,
  ELBELAND_EFFECT_ONLY_TYPES,
  ELBELAND_EMISSIONS,
} from './spec';

/**
 * Elbeland (World52 / Object52) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_51ELBELAND,
];

// Slot 2 is `AlphaTileGround01.Tga` in the original (MapManager.cpp:1371),
// which is a blank TGA meaning "no ground here" - see `CUTOUT` below. World52
// ships no TileGround01 at all, so Ground02 keeps the slot filled with
// something the loader can read; nothing ever samples it.
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
  'TileRock05',
  'TileRock06',
  'TileRock07',
];

// `RenderFace` (ZzzLodTerrain.cpp:1402-1412) puts slot 2 through
// `EnableAlphaTest` here, and `World52/AlphaTileGround01.OZT` is zero in every
// byte, so the 309 tiles that name it draw nothing at all. They are the narrow
// spans: the terrain is cut out from under the bridges so the walkway reads as
// a walkway over the drop.
const CUTOUT = 2;

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 61, y: 201 } as const;

// Open sky: rain falls here when the weather byte says so.
const OUTDOOR = true;

// `SetWorldClearColor` (SceneManager.cpp:361): a light grey, the only town
// whose sky is not black.
const CLEAR_COLOR = [178, 178, 178] as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const elbelandLayer: MapLayer = {
  name: 'elbeland',
  worlds: WORLDS,
  tiles: TILES,
  cutoutTile: CUTOUT,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  clearColor: CLEAR_COLOR,
  blendMeshes: ELBELAND_BLEND_MESHES,
  effectOnly: ELBELAND_EFFECT_ONLY_TYPES,
  emissions: ELBELAND_EMISSIONS,
  create: world => import('./create').then(m => m.createElbeland(world)),
};
