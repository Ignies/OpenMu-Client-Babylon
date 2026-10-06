import type { World } from '@/ecs/world';
import { LostTowerMachineObject } from './towerMachineObject';
import { LostTowerSkullObject } from './skullObject';
import { bindAbsentModels } from '../shared/objectVariants';

/**
 * Lost Tower (WD_4LOSTTOWER, world 4 / `Object5`).
 *
 * Almost everything this map does is table data - see spec.ts for the blend
 * meshes, the two hidden types and the lights, and the render.meshAnimations rows for
 * the UV scrolls. Only three of the 40 types need behaviour that a table
 * cannot hold, and they are wired here.
 *
 * Three things the original does that are deliberately not built:
 *
 *  - **Bats.** Lost Tower is the second home of `Object2/Bat01.glb` and
 *    `Object2/DungeonStone01.glb` (max 5 bats), flocking overhead. They are
 *    not map objects at all - they are a boid simulation the clone has no
 *    system for, and one bolted into a map module would be the wrong place
 *    for it. Left for whoever builds the ambient-creature system; Stadium's
 *    ground bugs want the same thing.
 *
 *  - **Type 9.** `RenderObjectVisual`'s `case WD_4LOSTTOWER:` has no `break`
 *    before `case WD_6STADIUM:`, so in this world a type-9 object also runs
 *    Stadium's `case 9` - a warm `BITMAP_LIGHT` sprite at bone 1, on all 200
 *    of Lost Tower's type-9 stair pieces (ZzzObject.cpp:2938-2946).
 *
 *    Not reproduced, and it is not a close call. Stadium's `case 9` is a
 *    2-bone brazier; Lost Tower's type 9 is `Object5/Object10.bmd`, a stair
 *    piece with **one bone** (`Box01`) and no bone 1. `BoneTransform[1]` is
 *    a global scratch array left over from the last multi-bone model drawn,
 *    and the call reads it through arguments the original has swapped anyway
 *    (`TransformPosition(BoneTransform[1], Position, p)` writes `p` and reads
 *    a `Position` never set - the same bug as Lorencia's merchant animal,
 *    ZzzObject.cpp:2764). There is no defined place to port: the sprite lands
 *    wherever that garbage puts it. Treated as inert.
 *
 *  - **The chrome pass** on types 3, 4, 19 and 20 (ZzzObject.cpp:1013-1032):
 *    the body redrawn with `BITMAP_CHROME` and `BodyLight` forced to
 *    (1.0, 0.2, 0.1), then the normal textured pass over the top. The clone
 *    has no per-object chrome pass - materials work. Its `StreamMesh`
 *    half (unlit + scrolling) is already in the render.meshAnimations rows, which is
 *    the part that actually reads as movement.
 */
export async function createLostTower(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // 19 red / 20 blue: the same rig, told apart by Type inside the class
  // (ZzzObject.cpp:2896-2905).
  tiles[19] = LostTowerMachineObject;
  tiles[20] = LostTowerMachineObject;

  // 38 skulls (n=777) and 39 stones (n=335), both routed to `CheckSkull`
  // (ZzzObject.cpp:3949-3951).
  tiles[38] = LostTowerSkullObject;
  tiles[39] = LostTowerSkullObject;

  // 40 (x1) has no Object41.bmd in `Object5` (LoadData.cpp:22-49): no body. Its
  // `BITMAP_LIGHTNING + 1` pair (ZzzObject.cpp:2913-2920) is not drawn here.
  bindAbsentModels(tiles, [40]);
}
