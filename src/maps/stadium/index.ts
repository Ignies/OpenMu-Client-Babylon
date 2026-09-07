import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  STADIUM_BLEND_MESHES,
  STADIUM_EFFECT_ONLY_TYPES,
  STADIUM_EMISSIONS,
} from './spec';

/**
 * Arena / Stadium (World7 / Object7) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_6STADIUM,
];

// World7 has no TileGround01: TileGround02 stands in for slot 2. Fetching the
// missing file failed the whole terrain download, so the arena never loaded.
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
const SPAWN = { x: 56, y: 85 } as const;

// Open sky: rain falls here when the weather byte says so.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const stadiumLayer: MapLayer = {
  name: 'stadium',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: STADIUM_BLEND_MESHES,
  effectOnly: STADIUM_EFFECT_ONLY_TYPES,
  emissions: STADIUM_EMISSIONS,
  create: world => import('./create').then(m => m.createStadium(world)),
};
