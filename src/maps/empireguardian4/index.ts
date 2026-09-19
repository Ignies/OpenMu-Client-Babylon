import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  EMPIRE_GUARDIAN_4_BLEND_MESHES,
  EMPIRE_GUARDIAN_4_EFFECT_ONLY_TYPES,
  EMPIRE_GUARDIAN_4_EMISSIONS,
} from './spec';

/**
 * Fortress of Imperial Guardian, day 4 (World73 / Object73) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

// Day 4 has its own everything: its own `World73` folder, its own tables (the
// login scene draws with them too) and its own `create`. Days 1-3 are
// `../empireguardian`.
const WORLDS: readonly ENUM_WORLD[] = [ENUM_WORLD.WD_72EMPIREGUARDIAN4];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 93, y: 67 } as const;

// Not `outdoor`: day 4 has no `CreateRain` and `PlayObjectSound` answers it
// with the indoor bed, not the three weather ones (GMEmpireGuardian1.cpp:2962).

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const empireguardian4Layer: MapLayer = {
  name: 'empireguardian4',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  blendMeshes: EMPIRE_GUARDIAN_4_BLEND_MESHES,
  effectOnly: EMPIRE_GUARDIAN_4_EFFECT_ONLY_TYPES,
  emissions: EMPIRE_GUARDIAN_4_EMISSIONS,
  create: world => import('./create').then(m => m.createEmpireGuardian4(world)),
};
