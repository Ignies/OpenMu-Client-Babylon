import type { World } from '../../ecs/world';
import { RaklionIceScarpObject } from '../raklion/iceScarpObject';
import { createRaklionWarpGate } from '../raklion/warpGateObject';
import { PlaySpeedObject, bindAbsentModels } from '../shared/objectVariants';

/**
 * Raklion's hatchery (`WD_58ICECITY_BOSS`, `World59`/`Object59`) - Selupan's
 * cave. 162 objects of 23 types, drawn by the same `CGM_Raklion` as Raklion
 * itself: every hook gates on `IsIceCity()` (GM_Raklion.cpp:2294-2306), so
 * the classes and the tables both come from `maps/raklion`.
 *
 * What the C++ has a case for on the types this world actually places:
 *
 *  - **6** (×1) and **7** (×2), :1057-1076 - the ice scarps, flat grey.
 *  - **68** (×6), **69** (×4), **71** (×2), :1328-1334 - `icebot01/02/03_R`,
 *    the floor lamps: mesh 0 forced additive with a `BlendMeshLight` pulse
 *    (`spec.ts` and `common/meshAnimation.ts`). 68 is also one of the three
 *    types driven by `Actions[].PlaySpeed` instead of `o->Velocity`
 *    (ZzzObject.cpp:3692) - and `LoadWorld` only writes that field on
 *    `WD_57ICECITY` (MapManager.cpp:1153-1163), while `Action_t` is
 *    value-initialised (ZzzBMD.cpp:3210). So on this world alone the lamps
 *    play at speed 0: they hold frame 0 and the pulse is all the motion they
 *    have. 69 and 71 are not in that list and keep the default 0.16.
 *  - **70** (×6), :254-260 + :1748-1768 - the blue brazier, an emitter with
 *    no body (`spec.ts`).
 *
 * **Not built** (all as on Raklion, see `maps/raklion/create.ts` for the
 * reasoning): **46** (×20) and **53** (×10), the `BossSpider01/02` webs and
 * their after-character draw; **57** (×3), whose case is a dead bone
 * transform; **82** (×1), the boss gate frozen on a server flag; **247**
 * (×7), the editor's re-saved warp records. **83** (×6, at 172.5/24.5) has
 * no `Object84.bmd` in `Object59` at all.
 *
 * The Selupan fight itself - the boss lowered from `Position[2] = 1000` on
 * READY, the egg clusters, `MoveEffect`'s screen shake, the
 * `Music/Raklion_Hatchery` switch `PlayBGM` (:2927-2946) makes - is all
 * server-driven and none of it is map-object work.
 */
export async function createRaklionBoss(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GM_Raklion.cpp:1057-1076.
  tiles[6] = RaklionIceScarpObject;
  tiles[7] = RaklionIceScarpObject;

  // ZzzObject.cpp:3692 with no MapManager override on this world.
  tiles[68] = PlaySpeedObject.at(0);

  // `Object59` has no `Object84.bmd` for 83; 247 is the same editor spill as
  // on Raklion proper.
  bindAbsentModels(tiles, [83, 247]);

  // MapManager.cpp:766-779: two gates one tile apart, back to Raklion.
  createRaklionWarpGate(world, 169, 24, 85);
  createRaklionWarpGate(world, 170, 24, 85);
}
