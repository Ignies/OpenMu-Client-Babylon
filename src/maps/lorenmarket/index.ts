import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  LOREN_MARKET_BLEND_MESHES,
  LOREN_MARKET_EFFECT_ONLY_TYPES,
  LOREN_MARKET_EMISSIONS,
} from './spec';

/**
 * Loren Market (World80 / Object80) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_79UNITEDMARKETPLACE,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 127, y: 145 } as const;

// `CreateRain` runs on Loren Market unconditionally (SceneManager.cpp:623-628).
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const lorenmarketLayer: MapLayer = {
  name: 'lorenmarket',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: LOREN_MARKET_BLEND_MESHES,
  effectOnly: LOREN_MARKET_EFFECT_ONLY_TYPES,
  emissions: LOREN_MARKET_EMISSIONS,
  create: world => import('./create').then(m => m.createLorenMarket(world)),
};
