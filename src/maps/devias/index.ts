import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import { DEVIAS_ROOMS } from './rooms';
import {
  DEVIAS_BLEND_MESHES,
} from './spec';

/**
 * Devias (World3 / Object3) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_2DEVIAS,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 219, y: 24 } as const;

// Open sky: rain falls here when the weather byte says so.
const OUTDOOR = true;

// `CreateDeviasSnow` gates on the world alone: the sky belongs to snow.
const SNOW = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const deviasLayer: MapLayer = {
  name: 'devias',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  snow: SNOW,
  rooms: DEVIAS_ROOMS,
  blendMeshes: DEVIAS_BLEND_MESHES,
  create: world => import('./create').then(m => m.createDevias(world)),
};
