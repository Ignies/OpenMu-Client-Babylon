import { ENUM_WORLD } from '@/core/types';
import type { MapLayer } from '@/controllers/maps/layer';
import { ROCK04_TILES } from '../recipes';
import {
  TARKAN_BLEND_MESHES,
  TARKAN_EFFECT_ONLY_TYPES,
  TARKAN_EMISSIONS,
  TARKAN_MESH_ANIMATIONS,
} from './spec';
import { TARKAN_SOUND } from './sound';
import { TARKAN_LIGHTING } from './lighting';
import { sit } from '../shared/terrain';

/**
 * Tarkan (World9 / Object9) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_8TARKAN,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 200, y: 58 } as const;

// Open sky, and a cloudless one: the profile runs fog density 0.01 over a
// sand horizon at 6% cloud. Nothing falls out of it - see DESERT.
const OUTDOOR = true;

// Desert: no rain whatever the weather byte says.
const DESERT = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const tarkanLayer: MapLayer = {
  name: 'tarkan',
  worlds: WORLDS,
  tiles: ROCK04_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  desert: DESERT,
  blendMeshes: TARKAN_BLEND_MESHES,
  effectOnly: TARKAN_EFFECT_ONLY_TYPES,
  emissions: TARKAN_EMISSIONS,
  render: { meshAnimations: TARKAN_MESH_ANIMATIONS },
  sound: TARKAN_SOUND,
  lighting: TARKAN_LIGHTING,
  terrain: { rest: { 78: sit(false) } },
  create: world => import('./create').then(m => m.createTarkan(world)),
};
