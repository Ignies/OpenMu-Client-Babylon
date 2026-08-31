import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  DOPPELGANGER4_BLEND_MESHES,
  DOPPELGANGER4_EFFECT_ONLY_TYPES,
  DOPPELGANGER4_EMISSIONS,
} from './spec';

/**
 * Doppelganger 4 (World69 / Object69) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_68DOPPLEGANGER4,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 93, y: 13 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const doppelganger4Layer: MapLayer = {
  name: 'doppelganger4',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  blendMeshes: DOPPELGANGER4_BLEND_MESHES,
  effectOnly: DOPPELGANGER4_EFFECT_ONLY_TYPES,
  emissions: DOPPELGANGER4_EMISSIONS,
  create: world => import('./create').then(m => m.createDoppelganger4(world)),
};
