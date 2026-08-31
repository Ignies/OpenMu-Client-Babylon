import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { ROCK04_TILES } from '../recipes';
import {
  KANTURU2_BLEND_MESHES,
  KANTURU2_EFFECT_ONLY_TYPES,
  KANTURU2_EMISSIONS,
} from './spec';

/**
 * Kanturu Relics (World39 / Object39) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_38KANTURU_2ND,
];

// World39: Rock01-04 only.
const TILES = ROCK04_TILES;

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 76, y: 105 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const kanturu2Layer: MapLayer = {
  name: 'kanturu2',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  blendMeshes: KANTURU2_BLEND_MESHES,
  effectOnly: KANTURU2_EFFECT_ONLY_TYPES,
  emissions: KANTURU2_EMISSIONS,
  create: world => import('./create').then(m => m.createKanturu2(world)),
};
