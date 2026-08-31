import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  KANTURU3_BLEND_MESHES,
  KANTURU3_EFFECT_ONLY_TYPES,
  KANTURU3_EMISSIONS,
} from './spec';

/**
 * Kanturu Remain (World40 / Object40) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_39KANTURU_3RD,
];

// Three OZJ tiles in the whole folder; slot 3 is `AlphaTileGround02.Tga` in the
// original (MapManager.cpp:1382), so Ground01 stands in for it. `EncTerrain40.map`
// also indexes slots 5, 6 and 11 (Water01 / Wood01 / Rock05 — none in the
// folder, unbound in the original), so the list is padded to twelve with
// Ground01 so those cells do not fall back to Grass01.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround01',
  'TileGround01',
  'TileGround01',
  'TileGround01',
  'TileGround01',
  'TileGround01',
  'TileGround01',
  'TileGround01',
  'TileGround01',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 198, y: 56 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const kanturu3Layer: MapLayer = {
  name: 'kanturu3',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  blendMeshes: KANTURU3_BLEND_MESHES,
  effectOnly: KANTURU3_EFFECT_ONLY_TYPES,
  emissions: KANTURU3_EMISSIONS,
  create: world => import('./create').then(m => m.createKanturu3(world)),
};
