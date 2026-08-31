import type { World } from '../../ecs/world';
import { ChaosCastleRingObject } from './ringObject';
import { resetChaosCastleArena } from './arena';
import {
  CHAOS_CASTLE_HIDDEN_RINGS,
  CHAOS_CASTLE_OUTER_RING,
} from './spec';

/**
 * Chaos Castle (`WD_18CHAOS_CASTLE` … `_END` and the master-level 53 — seven
 * server instances on one art set, `World19` + `Object19`; see
 * `common/worldAssets.ts`).
 *
 * The map *is* its state machine: a floor in a black void that loses a ring
 * of slabs at each of the match's three stage states, with the strip the
 * server just declared `TW_NOGROUND` closing under it. That is `arena.ts`
 * (the `g_currentCastleLevel` / `SetActionObject` pair from CSChaosCastle.cpp
 * and NewChaosCastleSystem.cpp), applied by `ChaosCastleRingObject`. The
 * `TW_NOGROUND` tiles it writes through `world.setTerrainFlags` are what
 * `deathSystem` reads to drop a body straight into the pit
 * (WSclient.cpp:5440-5487), and what `IsWalkable` refuses.
 *
 * Elsewhere, and why:
 *  - 6-12 the smoke-box markers: `spec.ts` effect-only.
 *  - The black clear colour is the scene default; `SetWorldClearColor`
 *    (SceneManager.cpp:346) sets exactly that.
 *  - `aChaos` / `iChaosCastle` beds: `sound/ambientBeds.ts`, on the match state.
 *  - Auto-attack off, `c->Run = 40` forced, no wings/pets, the CC 70-72
 *    monster skins from `Npc/`: all in the events / locomotion / character
 *    lanes, none of it map data.
 *
 * Not built: the thunder pillars (0-3 with `PKKey`, a `CreateJoint` ribbon —
 * no ribbon primitive in the clone), the quake, and the tile smoke on the
 * strip about to close (`RenderTerrainVisual`). All three are listed in
 * `arena.ts` / `spec.ts` against their C++ lines.
 */
export async function createChaosCastle(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // A fresh arena every warp in: every ring back where the object list put it.
  resetChaosCastleArena();

  for (const type of CHAOS_CASTLE_OUTER_RING) tiles[type] = ChaosCastleRingObject;
  for (const type of CHAOS_CASTLE_HIDDEN_RINGS) tiles[type] = ChaosCastleRingObject;
}
