import { ENUM_WORLD } from '@/core/types';
import type { MapLayer, Room } from '@/controllers/maps/layer';
import { ROCK02_TILES } from '../recipes';
import {
  LORENCIA_BLEND_MESHES,
  LORENCIA_TERRAIN,
  LORENCIA_EFFECT_ONLY_TYPES,
  LORENCIA_EMISSIONS,
  LORENCIA_MESH_ANIMATIONS,
} from './spec';
import { LORENCIA_SOUND } from './sound';
import { LORENCIA_LIGHTING } from './lighting';

/**
 * Lorencia (World1 / Object1) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_0LORENCIA,
];

// The square by the bar, the offline start.
const SPAWN = { x: 135, y: 131 } as const;

// Open sky, but it stays dry: no rain, wet stone or puddles in town.
const OUTDOOR = true;
const RAIN = false;

/** The pub floor the tavern dust hangs over, matching its interactive area (`create.ts`). */
const TAVERN: Room = {
  min: { x: 120, y: 120 },
  max: { x: 129, y: 136 },
  centre: { x: 124.5, z: 128 },
};

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const lorenciaLayer: MapLayer = {
  name: 'lorencia',
  worlds: WORLDS,
  tiles: ROCK02_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  rain: RAIN,
  blendMeshes: LORENCIA_BLEND_MESHES,
  effectOnly: LORENCIA_EFFECT_ONLY_TYPES,
  emissions: LORENCIA_EMISSIONS,
  render: { meshAnimations: LORENCIA_MESH_ANIMATIONS },
  // What flies here (`MoveBoids`, GOBoid.cpp:1304-1346).
  fx: { boids: 'bird' },
  sound: LORENCIA_SOUND,
  lighting: LORENCIA_LIGHTING,
  // `MoveLeaves`' leaves on the wind (ZzzEffectFireLeave.cpp:292-313); dust in the pub (ours).
  weather: { leaves: 'leaves', dust: [{ room: TAVERN, dust: 'tavern' }] },
  terrain: LORENCIA_TERRAIN,
  create: world => import('./create').then(m => m.createLorencia(world)),
};
