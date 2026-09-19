import type { World } from '../../ecs/world';
import {
  PlaySpeedObject,
  bindAbsentModels,
} from '../shared/objectVariants';
import { LOGIN_SCENE_ABSENT_MODELS, LOGIN_SCENE_PLAY_SPEEDS } from './spec';

/**
 * The login and character-select backdrops. The scene systems own the camera,
 * the line-up and the UI; this binds the two things the object data needs -
 * the play speeds `GMEmpireGuardian4::MoveObject` writes, and the types whose
 * model the folder never shipped.
 *
 * Both tables are keyed by world: `World74` and `World75` place disjoint sets
 * of them, and `World78`/`World79` get neither (they have no handler in the
 * original at all - see `spec.ts`).
 *
 * Not built, all of it from the day-4 hooks the two scenes inherit:
 *
 *  - `CreateObject`'s **10** (x1 World74, GMEmpireGuardian4.cpp:56-60):
 *    `SubType = rand() % 50`, then :181-190 holds `AnimationFrame` at 0 while
 *    it counts down - a start stagger worth up to two seconds, on one object.
 *  - **20**'s frame clamp (:197-205): a function-static `fAniFrame` shared by
 *    every type-20 object, so the ten of them march in lockstep and never
 *    skip more than ten keys. A per-type global, not a per-object setting.
 *  - The `RenderMesh` orders in `GMEmpireGuardian1::RenderObjectMesh`
 *    (:1341-1348 type 37, :1389-1398 type 49, :1407-1421 type 64, :1423-1432
 *    type 70) and `GMEmpireGuardian4::RenderAfterObjectMesh` (:1340-1357
 *    types 0/1/3/44). Each draws one mesh `RENDER_BRIGHT` instead of lit;
 *    this client takes that from the BMD's own texture flags (`_R`), which is
 *    the call `maps/kanturu1/spec.ts` and `maps/empireguardian/spec.ts` make
 *    for the same pattern. `blendMeshes` is for `o->BlendMesh` writes, and
 *    neither day-4 hook has one.
 *  - `GMEmpireGuardian4::RenderObjectMesh` :702-710, types 96 (x2), 97 (x1)
 *    and 100 (x1) on World74: `BodyLight` forced to a flat 0.170382. A
 *    material override, and only on four props.
 *  - The login scene's own render pass, `RenderObjects`
 *    (ZzzObject.cpp:3295-3338): World74 draws every object early, with
 *    `AlphaTarget` climbing 0.03 a frame inside `RENDER_OBJECT_DIST` and
 *    snapping to 0 outside it, and 122-124/126/127/129/159 getting twice that
 *    radius. That is the fly-through's fade-in - a renderer rule, not a map
 *    table. World75's version (:3346-3350) only moves 129 and 98 to the front
 *    of the frame.
 */

export async function createLoginScene(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  bindAbsentModels(tiles, LOGIN_SCENE_ABSENT_MODELS[world.mapIndex] ?? []);

  const speeds = LOGIN_SCENE_PLAY_SPEEDS[world.mapIndex];

  if (speeds) {
    for (const [type, speed] of Object.entries(speeds)) {
      tiles[Number(type)] = PlaySpeedObject.at(speed);
    }
  }
}
