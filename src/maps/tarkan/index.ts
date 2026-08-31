import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { ROCK04_TILES } from '../recipes';
import {
  TARKAN_BLEND_MESHES,
  TARKAN_EFFECT_ONLY_TYPES,
  TARKAN_EMISSIONS,
} from './spec';

/**
 * Tarkan (World9 / Object9) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_8TARKAN,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 200, y: 58 } as const;

// Open sky: rain falls here when the weather byte says so.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const tarkanLayer: MapLayer = {
  name: 'tarkan',
  worlds: WORLDS,
  tiles: ROCK04_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: TARKAN_BLEND_MESHES,
  effectOnly: TARKAN_EFFECT_ONLY_TYPES,
  emissions: TARKAN_EMISSIONS,
  create: world => import('./create').then(m => m.createTarkan(world)),
};
