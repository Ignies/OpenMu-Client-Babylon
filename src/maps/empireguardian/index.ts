import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  EMPIRE_GUARDIAN_BLEND_MESHES,
  EMPIRE_GUARDIAN_EFFECT_ONLY_TYPES,
  EMPIRE_GUARDIAN_EMISSIONS,
} from './spec';

/**
 * Fortress of Imperial Guardian, days 1-3 (World70-72 / Object70-72) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

// Days 1-3. Unlike the castles each day has its own `World<n+1>` folder; the
// three share every table. Day 4 has its own tables — see `../empireguardian4`.
const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_69EMPIREGUARDIAN1,
  ENUM_WORLD.WD_70EMPIREGUARDIAN2,
  ENUM_WORLD.WD_71EMPIREGUARDIAN3,
];

// Day 1's gate; days 2 and 3 land on the same cell offline.
const SPAWN = { x: 232, y: 16 } as const;

// `CreateRain` runs on the Fortress days 1-3 ("Later worlds").
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const empireguardianLayer: MapLayer = {
  name: 'empireguardian',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: EMPIRE_GUARDIAN_BLEND_MESHES,
  effectOnly: EMPIRE_GUARDIAN_EFFECT_ONLY_TYPES,
  emissions: EMPIRE_GUARDIAN_EMISSIONS,
  create: world => import('./create').then(m => m.createEmpireGuardian(world)),
};
