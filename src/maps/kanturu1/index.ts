import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  KANTURU1_BLEND_MESHES,
  KANTURU1_EFFECT_ONLY_TYPES,
  KANTURU1_EMISSIONS,
} from './spec';

/**
 * Kanturu Ruins (World38 / Object38) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_37KANTURU_1ST,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 20, y: 218 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const kanturu1Layer: MapLayer = {
  name: 'kanturu1',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: KANTURU1_BLEND_MESHES,
  effectOnly: KANTURU1_EFFECT_ONLY_TYPES,
  emissions: KANTURU1_EMISSIONS,
  create: world => import('./create').then(m => m.createKanturu1(world)),
};
