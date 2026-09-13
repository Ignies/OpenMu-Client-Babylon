import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import { DEVIAS_ROOMS } from './rooms';
import {
  DEVIAS_BLEND_MESHES,
} from './spec';

/**
 * Devias (World3 / Object3) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_2DEVIAS,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 219, y: 24 } as const;

// Open sky: rain falls here when the weather byte says so.
const OUTDOOR = true;

// `CreateDeviasSnow` gates on the world alone: the sky belongs to snow.
const SNOW = true;

/**
 * The ravines. 10 832 of Devias' tiles are `NoGround` - a branching network
 * of crevasses four to twenty tiles wide that the bridges cross - and with
 * the default treatment every one of them is a hole with the sky dome behind
 * it: a pane of pale blue lying *brighter* than the snow it is cut out of.
 *
 * Drawn instead, with the light taken off them over three tiles from the rim
 * and nothing left past that. Three is read off the original: its crevasses
 * are a white lip, a short fade through the map's own tile art, and then a
 * black nobody can see into, which is what `TerrainLight` gives them there.
 * Nothing is moved and no wall is built - the ravine keeps the shape and the
 * texture the map authored, and the strip a bridge crosses on keeps its deck,
 * because that strip is walkable ground and never in the fade at all.
 */
const PRECIPICE = { fade: 1, floor: 0 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const deviasLayer: MapLayer = {
  name: 'devias',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  snow: SNOW,
  precipice: PRECIPICE,
  rooms: DEVIAS_ROOMS,
  blendMeshes: DEVIAS_BLEND_MESHES,
  create: world => import('./create').then(m => m.createDevias(world)),
};
