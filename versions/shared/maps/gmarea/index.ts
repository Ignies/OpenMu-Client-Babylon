import { ENUM_WORLD } from '@/core/types';
import type { MapLayer } from '@/controllers/maps/layer';
import {
  KANTURU1_BLEND_MESHES,
  KANTURU1_EFFECT_ONLY_TYPES,
  KANTURU1_EMISSIONS,
  KANTURU1_MESH_ANIMATIONS,
} from '../kanturu1/spec';
import { GM_AREA_SOUND } from './sound';
import { GM_AREA_LIGHTING } from './lighting';

/**
 * GM area (World41 / Object41) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_40AREA_FOR_GM,
];

// World41 has no Wood01 and no Rock04: Ground01 / Rock03 stand in.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround02',
  'TileGround03',
  'TileWater01',
  'TileGround01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock03',
  'TileRock05',
  'TileRock06',
  'TileRock07',
];

// World41 has 693 walkable cells, all in the ruins cluster around (228,26);
// (130,80) is NoMove|NoGround and left the hero in black void.
const SPAWN = { x: 228, y: 26 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const gmareaLayer: MapLayer = {
  name: 'gmarea',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  // The GM area is a Kanturu Ruins cut-down: it shares the Ruins tables.
  blendMeshes: KANTURU1_BLEND_MESHES,
  effectOnly: KANTURU1_EFFECT_ONLY_TYPES,
  emissions: KANTURU1_EMISSIONS,
  render: { meshAnimations: KANTURU1_MESH_ANIMATIONS },
  sound: GM_AREA_SOUND,
  lighting: GM_AREA_LIGHTING,
  create: world => import('./create').then(m => m.createGmArea(world)),
};
