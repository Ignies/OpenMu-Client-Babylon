import { OperateBoxObject } from '../../common/operateBoxObject';
import type { World } from '../../ecs/world';

/**
 * Valley of Loren (`WD_30BATTLECASTLE`, `World31`/`Object31`) — the Castle
 * Siege map, staged at peace.
 *
 * `CreateBattleCastleObject` (GMBattleCastle.cpp:986-1049): 77 and 84 are
 * `CreateOperate` click targets (one 77 at 176.5/216.7, 37 84s around
 * 173/201 — the crown / registration altar area); 8/9/7/10/13/14 and the four
 * wall types only set `ExtState`/collision for the siege; 19 forces scale 1;
 * 41 gets a random timer phase (unused outside `MoveBattleCastleVisual`'s
 * siege branch); 79 spawns the `MODEL_TOWER_GATE_PLANE` effect model (no
 * effect-model system here — the gate draws without its energy sheet).
 *
 * `MoveBattleCastleVisual` case 4 scrolls U at `0.0001`/ms with `HiddenMesh
 * = -1`, i.e. on *no* blend mesh — a no-op in the original's own renderer
 * unless the BMD flags a mesh, so it is left out of `meshAnimation.ts`.
 *
 * Not built: the whole siege — `ExtState`-driven wall ruin swaps
 * (`CreateEffect(o->Type, …)` + `SOUND_BC_WALL_HIT`), `battleCastle::
 * CreateFireSnuff`, the `EncTerrain312.att` / `TerrainLight2.jpg` wartime
 * variants (MapManager.cpp:1257, 1330), the black clear colour inside
 * `InBattleCastle2`. The peacetime `Music/castle` (`MUSIC_CASTLE_PEACE`)
 * and the `aSiegeAmbi` bed (`SOUND_BC_AMBIENT`, :729) are in the sound tables.
 */
export async function createValleyOfLoren(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GMBattleCastle.cpp:1038-1040 — `CreateOperate(o)` with the default box.
  tiles[77] = OperateBoxObject;
  tiles[84] = OperateBoxObject;
}
