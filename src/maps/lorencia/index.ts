import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { ROCK02_TILES } from '../recipes';
import {
  LORENCIA_BLEND_MESHES,
  LORENCIA_EFFECT_ONLY_TYPES,
  LORENCIA_EMISSIONS,
} from './spec';

/**
 * Lorencia (World1 / Object1) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_0LORENCIA,
];

// The square by the bar, the offline start.
const SPAWN = { x: 135, y: 131 } as const;

// Open sky, but it stays dry: no rain, wet stone or puddles in town.
const OUTDOOR = true;
const RAIN = false;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const lorenciaLayer: MapLayer = {
  name: 'lorencia',
  worlds: WORLDS,
  tiles: ROCK02_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  rain: RAIN,
  blendMeshes: LORENCIA_BLEND_MESHES,
  effectOnly: LORENCIA_EFFECT_ONLY_TYPES,
  emissions: LORENCIA_EMISSIONS,
  create: world => import('./create').then(m => m.createLorencia(world)),
};
