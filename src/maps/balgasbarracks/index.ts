import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  BALGAS_BLEND_MESHES,
  BALGAS_EFFECT_ONLY_TYPES,
  BALGAS_EMISSIONS,
} from './spec';

/**
 * Balgas Barracks (World42 / Object42) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_41CHANGEUP3RD_1ST,
];

// Rock01-04 only, but `EncTerrain42.map` also indexes slot 11 (`TileRock05`,
// which the folder does not ship — unbound in the original); Rock04 stands in
// so the slot does not fall back to Grass01 (terrainMaterial.ts `valid1`).
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
  'TileRock04',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 30, y: 80 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const balgasbarracksLayer: MapLayer = {
  name: 'balgasbarracks',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  blendMeshes: BALGAS_BLEND_MESHES,
  effectOnly: BALGAS_EFFECT_ONLY_TYPES,
  emissions: BALGAS_EMISSIONS,
  create: world => import('./create').then(m => m.createBalgasBarracks(world)),
};
