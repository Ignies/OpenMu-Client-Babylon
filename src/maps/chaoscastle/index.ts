import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  CHAOS_CASTLE_BLEND_MESHES,
  CHAOS_CASTLE_EFFECT_ONLY_TYPES,
  CHAOS_CASTLE_EMISSIONS,
} from './spec';

/**
 * Chaos Castle (World19 / Object19) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

// The six Chaos Castle arenas and the master-level one (`InChaosCastle()`,
// MapManager.cpp:1592).
const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_18CHAOS_CASTLE,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 1,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 2,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 3,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 4,
  ENUM_WORLD.WD_18CHAOS_CASTLE_END,
  ENUM_WORLD.WD_53CAOSCASTLE_MASTER_LEVEL,
];

// Every arena loads `World19` / `Object19`.
const ASSET_WORLD = ENUM_WORLD.WD_18CHAOS_CASTLE + 1;

// World19 carries the full fourteen.
const TILES = FULL_TILES;

// The middle of the arena floor.
const SPAWN = { x: 34, y: 92 } as const;

// Open sky: `MoveLeaves` rains on the castle unconditionally
// (`InChaosCastle()`, ZzzEffectFireLeave.cpp:428-436); see
// `weather/rainState.ts` ALWAYS_RAINING.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const chaoscastleLayer: MapLayer = {
  name: 'chaoscastle',
  worlds: WORLDS,
  assetWorld: ASSET_WORLD,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: CHAOS_CASTLE_BLEND_MESHES,
  effectOnly: CHAOS_CASTLE_EFFECT_ONLY_TYPES,
  emissions: CHAOS_CASTLE_EMISSIONS,
  create: world => import('./create').then(m => m.createChaosCastle(world)),
};
