import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  SANTA_TOWN_BLEND_MESHES,
  SANTA_TOWN_EFFECT_ONLY_TYPES,
  SANTA_TOWN_EMISSIONS,
} from './spec';

/**
 * Santa Town (World63 / Object63) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_62SANTA_TOWN,
];

// No OpenMU gate for Santa Town; the village square by the tree
// (EncTerrain63.obj clusters around 220/90). Gates.cs (220,90) is TW_NOMOVE
// in EncTerrain63.att; (220,51) is the nearest walkable cell, on the village
// side of the gate.
const SPAWN = { x: 220, y: 51 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// `g_SantaTown.CreateSnow` (ZzzEffectFireLeave.cpp:482).
const SNOW = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const santatownLayer: MapLayer = {
  name: 'santatown',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  snow: SNOW,
  blendMeshes: SANTA_TOWN_BLEND_MESHES,
  effectOnly: SANTA_TOWN_EFFECT_ONLY_TYPES,
  emissions: SANTA_TOWN_EMISSIONS,
  create: world => import('./create').then(m => m.createSantaTown(world)),
};
