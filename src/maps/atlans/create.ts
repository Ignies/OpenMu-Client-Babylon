import { OperateBoxObject } from '../../common/operateBoxObject';
import type { World } from '../../ecs/world';
import { AtlansAnemoneObject } from './anemoneObject';
import { AtlansBubbleVentObject } from './bubbleVentObject';

/**
 * Atlans (World 8 / `Object8`), the underwater map. `CreateObject`
 * (ZzzObject.cpp:4718-4725) touches exactly one of the 41 types and
 * `MoveObject` (:4005-4034) six more; `RenderObjectVisual` has no World 8
 * case at all. Almost everything those seven cases need is table data and
 * lives in `spec.ts` or in `common/meshAnimation.ts` — this file is the three
 * class assignments and the notes on what the original does here that we do
 * not.
 *
 * Type identities, from EncTerrain8.obj and the models: 0-2 seabed rock, 3-4
 * starfish, 5/6/21/26/31/33 seaweed, 7-10 decorative fish, 11-19 the Atlantis
 * palace, 20/29/30 stone, 22 bubble vent, 23 water plane, 24/25/27/28 kelp
 * (28 carries 91 bones), 32/34 coral lamps, 35-37 skeletons, 38 god-ray, 39
 * pose box, 40 anemone.
 *
 * **Not implemented, deliberately — the underwater layer.** Atlans is not
 * just a map with kelp on it; the original changes how the client behaves
 * while you are in it, and none of that is object work:
 *
 *  - **Swim locomotion.** `PLAYER_WALK_SWIM` (24) and `PLAYER_RUN_SWIM` (33)
 *    replace the walk/run clips for every character in World 8 (roadmap
 *    locomotion). The clips are already in the player GLBs and `playerPlaySpeed`
 *    already has their rates; what is missing is the map-conditional swap in
 *    the animation system.
 *  - **The terrain caustics pass.** `ZzzLodTerrain.cpp:1591` replaces layer-2
 *    tile 5 with a 32-frame `wt00..wt31` additive flipbook, which is what
 *    makes the seabed ripple. Terrain material work, not map work.
 *  - **Player head bubbles**, the boid fish shoals (`Object8/Fish02..09.glb`
 *    are placed by the boid code, not by EncTerrain8.obj — which is why they
 *    have no type numbers), and the 20 %-opacity shadows the original uses
 *    down here.
 *  - **No grass layer.** Atlans never renders one; the port has no grass
 *    layer to suppress yet.
 *
 * Music (`Music/atlans`) and the `Sound/aWater` ambient bed are wired
 * elsewhere.
 */
export async function createAtlans(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // Atlans 22 (ZzzObject.cpp:4007-4012), ×845: hidden marker, bubbles on a
  // 4 s duty cycle. Effect-only (spec.ts) so the model never loads; the class
  // owns the timer and the emitter.
  tiles[22] = AtlansBubbleVentObject;

  // Atlans 39 (ZzzObject.cpp:4719-4723), ×4 — the "lean on the wall" pose
  // trigger, already mapped as `pose(true)` in libs/mu/restObjects.ts.
  //
  // `OperateBoxObject`, *not* `LeanBoxObject`: the Atlans case is
  // `CreateOperate(o); o->HiddenMesh = -2;` and nothing else. The
  // `Vector(40.f, 40.f, 160.f, o->BoundingBoxMax)` line that doubles the pick
  // box belongs to Lorencia's MODEL_POSE_BOX (:4585) and to Dungeon 60 /
  // Devias 91 / Market 67 — Atlans 39 keeps `CreateObject`'s default
  // `(-40,-40,0)…(40,40,80)` box (:4457-4494). loadMapIntoScene previously
  // registered the lean box here, which made these four triggers twice as
  // tall as the original's.
  tiles[39] = OperateBoxObject;

  // Atlans 40 (ZzzObject.cpp:4030-4034), ×86: the anemone, at a third speed.
  tiles[40] = AtlansAnemoneObject;
}
