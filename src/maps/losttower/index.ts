import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { ROCK04_TILES } from '../recipes';
import {
  LOST_TOWER_BLEND_MESHES,
  LOST_TOWER_EFFECT_ONLY_TYPES,
  LOST_TOWER_EMISSIONS,
} from './spec';

/**
 * Lost Tower (World5 / Object5) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_4LOSTTOWER,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 208, y: 81 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const losttowerLayer: MapLayer = {
  name: 'losttower',
  worlds: WORLDS,
  tiles: ROCK04_TILES,
  spawn: SPAWN,
  blendMeshes: LOST_TOWER_BLEND_MESHES,
  effectOnly: LOST_TOWER_EFFECT_ONLY_TYPES,
  emissions: LOST_TOWER_EMISSIONS,
  create: world => import('./create').then(m => m.createLostTower(world)),
};
