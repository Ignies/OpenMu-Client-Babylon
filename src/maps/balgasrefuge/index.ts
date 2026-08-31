import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  BALGAS_BLEND_MESHES,
  BALGAS_EFFECT_ONLY_TYPES,
  BALGAS_EMISSIONS,
} from '../balgasbarracks/spec';

/**
 * Balgas Refuge (World43 / Object43) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_42CHANGEUP3RD_2ND,
];

// Rock01-04 only, but `EncTerrain43.map` also indexes slot 11 (`TileRock05`,
// not in the folder — unbound in the original); Rock04 stands in.
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

// No spawn gate in OpenMU (entry is through the Barracks' exit gate 257 →
// 104-107/178-181).
const SPAWN = { x: 105, y: 179 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const balgasrefugeLayer: MapLayer = {
  name: 'balgasrefuge',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  // The Refuge is the Barracks' art set: it shares the Barracks tables.
  blendMeshes: BALGAS_BLEND_MESHES,
  effectOnly: BALGAS_EFFECT_ONLY_TYPES,
  emissions: BALGAS_EMISSIONS,
  create: world => import('./create').then(m => m.createBalgasRefuge(world)),
};
