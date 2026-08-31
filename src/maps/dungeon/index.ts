import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { ROCK02_TILES } from '../recipes';
import {
  DUNGEON_BLEND_MESHES,
  DUNGEON_EFFECT_ONLY_TYPES,
  DUNGEON_EMISSIONS,
} from './spec';

/**
 * Dungeon (World2 / Object2) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_1DUNGEON,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 232, y: 126 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const dungeonLayer: MapLayer = {
  name: 'dungeon',
  worlds: WORLDS,
  tiles: ROCK02_TILES,
  spawn: SPAWN,
  blendMeshes: DUNGEON_BLEND_MESHES,
  effectOnly: DUNGEON_EFFECT_ONLY_TYPES,
  emissions: DUNGEON_EMISSIONS,
  create: world => import('./create').then(m => m.createDungeon(world)),
};
