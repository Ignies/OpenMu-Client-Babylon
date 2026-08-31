import type { World } from '../../ecs/world';
import { LostTowerMachineObject } from './towerMachineObject';
import { LostTowerSkullObject } from './skullObject';

/**
 * Lost Tower (WD_4LOSTTOWER, world 4 / `Object5`).
 *
 * Almost everything this map does is table data — see spec.ts for the blend
 * meshes, the two hidden types and the lights, and common/meshAnimation.ts for
 * the UV scrolls. Only three of the 40 types need behaviour that a table
 * cannot hold, and they are wired here.
 *
 * Three things the original does that are deliberately not built:
 *
 *  - **Bats.** Lost Tower is the second home of `Object2/Bat01.glb` and
 *    `Object2/DungeonStone01.glb` (max 5 bats), flocking overhead. They are
 *    not map objects at all — they are a boid simulation the clone has no
 *    system for, and one bolted into a map module would be the wrong place
 *    for it. Left for whoever builds the ambient-creature system; Stadium's
 *    ground bugs want the same thing.
 *
 *  - **Type 9.** `RenderObjectVisual`'s `case WD_4LOSTTOWER:` has no `break`
 *    before `case WD_6STADIUM:` (ZzzObject.cpp:2944), so in this world a
 *    type-9 object also runs Stadium's `case 9` — a warm `BITMAP_LIGHT`
 *    sprite at bone 1, on all 200 of Lost Tower's type-9 objects.
 *
 *    Not reproduced, and it is not a close call. Stadium's `case 9` is a
 *    2-bone brazier; Lost Tower's type 9 is `Object10.glb`, a re_08 stone
 *    block with **zero bones**. `BoneTransform[1]` is a global scratch array
 *    left over from whatever model was drawn last, and the call reads it
 *    through arguments the original has swapped anyway
 *    (`TransformPosition(BoneTransform[1], Position, p)` writes `p` and reads
 *    an uninitialised `Position` — the same bug as Lorencia's merchant
 *    animal, ZzzObject.cpp:2770). There is no position to port: the sprite
 *    lands wherever the last frame's garbage put it. Treated as inert.
 *
 *  - **The chrome pass** on types 3, 4, 19 and 20 (ZzzObject.cpp:1013-1032):
 *    the body redrawn with `BITMAP_CHROME` and `BodyLight` forced to
 *    (1.0, 0.2, 0.1), then the normal textured pass over the top. The clone
 *    has no per-object chrome pass — materials work. Its `StreamMesh`
 *    half (unlit + scrolling) is already in common/meshAnimation.ts, which is
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
}
