import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  RAKLION_BLEND_MESHES,
  RAKLION_EFFECT_ONLY_TYPES,
  RAKLION_EMISSIONS,
} from '../raklion/spec';

/**
 * Raklion's hatchery (World59 / Object59) - the map entry: identity and the
 * per-world data the renderer, the terrain loader, the weather and the sound
 * tables read.
 *
 * Raklion's hatchery (`WD_58ICECITY_BOSS`, `World59`/`Object59`) - Selupan's
 * cave, 162 objects. It runs the same `CGM_Raklion` as Raklion, so the
 * tables come from `maps/raklion/spec.ts` and the object classes from
 * `maps/raklion`; `create.ts` binds them and lists what is left out.
 *
 * Sound: `aWind` is the bed (SceneManager.cpp:620-622);
 * `Music/Raklion_Hatchery` is the idle track `PlayBGM` (:2927-2946) plays
 * until the boss state machine swaps it.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_58ICECITY_BOSS,
];

// OpenMU's exit gate 291 (160-161, 24-27).
const SPAWN = { x: 160, y: 25 } as const;

// `g_Raklion.CreateSnow` covers both Ice City worlds (ZzzEffectFireLeave.cpp:481).
const SNOW = true;

// The hatchery is Raklion's art set and takes Raklion's sky with it: snow
// climate, no fall. See `maps/raklion/index.ts`.
const SNOWFALL = false;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const raklionbossLayer: MapLayer = {
  name: 'raklionboss',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  snow: SNOW,
  snowfall: SNOWFALL,
  // The hatchery is Raklion's art set: it shares the Raklion tables.
  blendMeshes: RAKLION_BLEND_MESHES,
  effectOnly: RAKLION_EFFECT_ONLY_TYPES,
  emissions: RAKLION_EMISSIONS,
  create: world => import('./create').then(m => m.createRaklionBoss(world)),
};
