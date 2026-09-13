import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import { DEVIAS_ROOMS } from './rooms';
import {
  DEVIAS_BLEND_MESHES,
} from './spec';

/**
 * Devias (World3 / Object3) — the map entry: identity and the per-world data the
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
 * The ravines. 10 832 of Devias' tiles are `NoGround` — a branching network
 * of crevasses four to twenty tiles wide that the bridges cross — and with
 * the default treatment every one of them is a hole with the sky dome behind
 * it, which is a pane of pale blue lying *brighter* than the snow it is cut
 * out of.
 *
 * `depth` is read off the map's own art rather than picked: the cliff-face
 * meshes standing along these rims hang to about eleven tiles under the
 * ground they are pinned to, and a floor shallower than that would have cut
 * them off at the knee. It is far more than the whole height map's relief
 * (3.8 tiles top to bottom), which is the point - a crevasse is not a dip in
 * the field, it is the field ending, and a wall no deeper than Devias' own
 * slopes reads as another drift.
 *
 * The mask starts at 0.1, just under the lowest tile anyone can stand on
 * here (the shallowest walkable height on the map is 0.135), so none of the
 * snow field is inside it and all of it is the map's own colour; three tiles
 * lower there is nothing left. The rim keeps a tile and a half of lit lip,
 * the wall grades away over the three under it and the remaining six or
 * seven are gone - which is what sells the depth, rather than how far down
 * the floor is actually drawn.
 */
/**
 * The two Object3 slots the suspension bridges are built out of - the rails
 * that stand down each side of a span, 34 placements over the map's five
 * crossings. They are what says "this strip of ground is a bridge", and the
 * ground between them goes into the ravine with the rest of it.
 */
const BRIDGE_PARTS = [12, 13] as const;

const PRECIPICE = {
  depth: 11,
  slope: 1.5,
  maskTop: 0.1,
  maskBottom: -2.5,
  floor: 0,
  bridgeParts: BRIDGE_PARTS,
} as const;

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
