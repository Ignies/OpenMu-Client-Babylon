import { ENUM_WORLD } from '@/core/types';
import type { MapLayer } from '@/controllers/maps/layer';
import {
  NORIA_BLEND_MESHES,
  NORIA_EFFECT_ONLY_TYPES,
  NORIA_EMISSIONS,
} from './spec';
import { NORIA_SOUND } from './sound';
import { NORIA_LIGHTING } from './lighting';
import { healing, sit } from '../shared/terrain';

/**
 * Noria (World4 / Object4) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_3NORIA,
];

// World4 has no TileGrass02 and no TileGround02: Grass01 / Ground01 stand in for
// slots 1 and 3 so `EncTerrain4.map` keeps its indices.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass01',
  'TileGround01',
  'TileGround01',
  'TileGround03',
  'TileWater01',
  'TileWood01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 174, y: 123 } as const;

// Open sky: rain falls here when the weather byte says so.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const noriaLayer: MapLayer = {
  name: 'noria',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: NORIA_BLEND_MESHES,
  effectOnly: NORIA_EFFECT_ONLY_TYPES,
  emissions: NORIA_EMISSIONS,
  sound: NORIA_SOUND,
  lighting: NORIA_LIGHTING,
  // The streets darken and pool in the rain; the petals are Lorencia's
  // leaves on Noria's own `leaf01` (ZzzEffectFireLeave.cpp:292-313).
  weather: { wetGround: true, leaves: 'petals' },
  terrain: {
    // The rain's wet ground and its puddles (ours; `weather.wetGround` drives them).
    overlays: ['wetGround', 'puddles'],
    rest: { 8: sit(false), 38: healing(true) },
    leanCursor: [38],
  },
  create: world => import('./create').then(m => m.createNoria(world)),
};
