import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  VALLEY_OF_LOREN_BLEND_MESHES,
  VALLEY_OF_LOREN_EFFECT_ONLY_TYPES,
  VALLEY_OF_LOREN_EMISSIONS,
} from './spec';

/**
 * Valley of Loren (World31 / Object31) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_30BATTLECASTLE,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 95, y: 38 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const valleyoflorenLayer: MapLayer = {
  name: 'valleyofloren',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: VALLEY_OF_LOREN_BLEND_MESHES,
  effectOnly: VALLEY_OF_LOREN_EFFECT_ONLY_TYPES,
  emissions: VALLEY_OF_LOREN_EMISSIONS,
  create: world => import('./create').then(m => m.createValleyOfLoren(world)),
};
