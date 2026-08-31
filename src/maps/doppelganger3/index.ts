import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  DOPPELGANGER3_BLEND_MESHES,
  DOPPELGANGER3_EFFECT_ONLY_TYPES,
  DOPPELGANGER3_EMISSIONS,
} from './spec';

/**
 * Doppelganger 3 (World68 / Object68) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_67DOPPLEGANGER3,
];

// World68 has no Ground02 and no Water01: Ground01 / Grass01 stand in.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround01',
  'TileGround03',
  'TileGrass01',
  'TileWood01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 108, y: 60 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const doppelganger3Layer: MapLayer = {
  name: 'doppelganger3',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  blendMeshes: DOPPELGANGER3_BLEND_MESHES,
  effectOnly: DOPPELGANGER3_EFFECT_ONLY_TYPES,
  emissions: DOPPELGANGER3_EMISSIONS,
  create: world => import('./create').then(m => m.createDoppelganger3(world)),
};
