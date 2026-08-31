import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  DUEL_ARENA_BLEND_MESHES,
  DUEL_ARENA_EFFECT_ONLY_TYPES,
  DUEL_ARENA_EMISSIONS,
} from './spec';

/**
 * Duel Arena (World65 / Object65) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Duel Arena (`WD_64DUELARENA`, `World65`/`Object65`) — four fenced rings.
 *
 * `CGMDuelArena::CreateObject` (GMDuelArena.cpp:41-50) makes 0/1/32
 * unpickable (no hook); `MoveObject` (:64-89) is the three hidden types and
 * the brazier light in `spec.ts`. `RenderObjectVisual` (:122-164) is the
 * duel-state banner effects, server-driven.
 *
 * `Music/DuelArena`; no bed. OpenMU has twelve spawn gates here, one per
 * duel slot — offline lands on the first (101, 64).
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_64DUELARENA,
];

// World65: Rock01-05.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround02',
  'TileGround03',
  'TileWater01',
  'TileWood01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
  'TileRock05',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 101, y: 64 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const duelarenaLayer: MapLayer = {
  name: 'duelarena',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  blendMeshes: DUEL_ARENA_BLEND_MESHES,
  effectOnly: DUEL_ARENA_EFFECT_ONLY_TYPES,
  emissions: DUEL_ARENA_EMISSIONS,
};
