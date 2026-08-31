import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  RAKLION_BLEND_MESHES,
  RAKLION_EFFECT_ONLY_TYPES,
  RAKLION_EMISSIONS,
} from '../raklion/spec';

/**
 * Raklion's hatchery (World59 / Object59) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Raklion's hatchery (`WD_58ICECITY_BOSS`, `World59`/`Object59`) — Selupan's
 * cave, 162 objects.
 *
 * Runs the same `CGM_Raklion::MoveObject` as Raklion; the tables are in
 * `maps/raklion/spec.ts` and registered for this world from there.
 *
 * Not built: the Selupan fight (`m_byState`, the boss lowered from
 * `Position[2] = 1000` on READY, the egg clusters, `MoveEffect`) — all
 * server-driven; `Music/Raklion_Hatchery` is the idle track `PlayBGM`
 * (:2872-2890) starts with. `aWind` is the bed (SceneManager.cpp:620-622).
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_58ICECITY_BOSS,
];

// OpenMU's exit gate 291 (160-161, 24-27).
const SPAWN = { x: 160, y: 25 } as const;

// `g_Raklion.CreateSnow` covers both Ice City worlds (ZzzEffectFireLeave.cpp:481).
const SNOW = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const raklionbossLayer: MapLayer = {
  name: 'raklionboss',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  snow: SNOW,
  // The hatchery is Raklion's art set: it shares the Raklion tables.
  blendMeshes: RAKLION_BLEND_MESHES,
  effectOnly: RAKLION_EFFECT_ONLY_TYPES,
  emissions: RAKLION_EMISSIONS,
};
