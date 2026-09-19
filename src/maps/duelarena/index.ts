import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  DUEL_ARENA_BLEND_MESHES,
  DUEL_ARENA_EFFECT_ONLY_TYPES,
  DUEL_ARENA_EMISSIONS,
} from './spec';

/**
 * Duel Arena (World65 / Object65) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Duel Arena (`WD_64DUELARENA`, `World65`/`Object65`) - four fenced rings on
 * Vulcanus's art set.
 *
 * `CGMDuelArena::CreateObject` (GMDuelArena.cpp:33-43) makes 0/1/32
 * unpickable (`CollisionRange = -300`; no hook for that in `ModelObject`) and
 * spawns nothing, so the map owns no entity and has no `create.ts`.
 * `MoveObject` (:58-80) hides 34/35/36 and lights the type-34 brazier;
 * `RenderObjectVisual` (:116-159) gives 35 its smoke and 36 its flare and
 * flame. All of it is in `spec.ts`. `RenderObjectMesh`,
 * `RenderAfterObjectMesh`, `MoveMonsterVisual`, `MoveBlurEffect`,
 * `RenderMonsterVisual`, `SetCurrentActionMonster`, `AttackEffectMonster`,
 * `PlayMonsterSound` and `PlayObjectSound` are all empty or commented out.
 *
 * `Music/DuelArena`; no bed. OpenMU has twelve spawn gates here, one per
 * duel slot - offline lands on the first (101, 64).
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

// Open sky, on the same reading as Vulcanus next door (World64, whose
// textures this folder shares): a roofless arena among the Season 2-6 fields
// the original never rains on, outdoors in the sense Noria and Tarkan are.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const duelarenaLayer: MapLayer = {
  name: 'duelarena',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: DUEL_ARENA_BLEND_MESHES,
  effectOnly: DUEL_ARENA_EFFECT_ONLY_TYPES,
  emissions: DUEL_ARENA_EMISSIONS,
  create: world => import('./create').then(m => m.createDuelArena(world)),
};
