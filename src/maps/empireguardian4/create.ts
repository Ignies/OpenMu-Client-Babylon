import type { World } from '../../ecs/world';
import {
  PlaySpeedObject,
  bindAbsentModels,
} from '../shared/objectVariants';
import { EmpireGuardian4ChandelierObject } from './chandelierObject';
import { EMPIRE_GUARDIAN_4_ABSENT_MODELS } from './spec';
import { EmpireGuardian4StartDelayObject } from './startDelayObject';
import { EmpireGuardian4WallTorchObject } from './wallTorchObject';

/**
 * Fortress of Imperial Guardian day 4 (`WD_72EMPIREGUARDIAN4`, `World73` /
 * `Object73`). Days 1-3 are `../empireguardian/create.ts`; day 4 is a
 * separate module because it is the only day that sets up types 10, 37 and
 * 157, and the only one whose `MoveObject` runs against `Object73`.
 *
 * `MoveObject` (GMEmpireGuardian4.cpp:148-240) is three things: the play
 * speed multipliers below, the type 10 countdown, and the
 * `o->HiddenMesh = -2` list in `spec.ts`. `CreateObject` (:35-64) is four
 * cases, three of which this client does not model:
 *
 *  - **129-132** (:39-48) round `Angle[2]` into 0-359 and cache it as
 *    `HeadAngle`/`HeadTargetAngle`. All four are hidden markers here, and the
 *    cache is read by the event's turning statues (`RenderFrontSideVisual`),
 *    which is event state; the yaw itself already arrives normalised through
 *    the terrain loader.
 *  - **115/117** (:50-55) set `SubType = 100`, the "may fire" flag for the
 *    projectile `RenderObjectMesh` throws off bone 9 every time the clip
 *    passes frame 0 (GMEmpireGuardian1.cpp:1434-1518). Neither type is placed
 *    in EncTerrain73.obj (x0), so nothing on day 4 reads it.
 *  - **10** (:56-60) is `startDelayObject.ts`.
 *
 * Not built:
 *
 *  - The event: `CreateMonster` (:66-146) and its four bosses, the star and
 *    rush gates and their reposition tables (`RenderObjectMesh` :711-794),
 *    `MoveBlurEffect`, `SetCurrentActionMonster`, `RenderFrontSideVisual`.
 *    None of it is a map object.
 *  - **12, 20, 50 and 64** - the drawn `RenderObjectVisual` cases that need a
 *    particle kind `common/effectParticles.ts` does not have, or a system
 *    this layer has no seam for (83, 84 and 85 are the effect-only ones, and
 *    are listed in `spec.ts`):
 *    12 (x0) two `BITMAP_SHINY+6` sprite pairs on bones 2 and 3;
 *    20 (x8) four `BITMAP_JOINT_SPARK` joints plus a `BITMAP_SPARK` SubType
 *    11 in the two animation windows 5.4-6.5 and 15.4-16.5 (joints are their
 *    own system, and SubType 11 is not the ported `spark03_24`);
 *    50 (x1) `BITMAP_FIRE_HIK3_MONO` SubType 4 on bones 2 to 7 - and
 *    `Gatewall01.smd` has exactly one bone, so the original is reading
 *    `BoneTransform[2..7]` off the end of its own rig;
 *    64 (x8) three `BITMAP_CLOUD` SubType 22 thrown 30 units ahead of the
 *    statue in the windows 9.5-11.5 and 23.5-25.5.
 *  - **96/97/100** (x3/x1/x1, :702-710): `b->BodyLight` forced flat to
 *    0.170382 before `RenderBody`, i.e. the King_Tower pieces are drawn dark
 *    and unlit. There is no per-object `BodyLight` seam on `ModelObject`;
 *    this is materials work.
 *  - **0/1/3/44 and 81** (:1342-1365 with GMEmpireGuardian1.cpp:1333-1339):
 *    deferred to `RenderAfterObjectMesh`, where 0/1/3/44 redraw mesh 2
 *    additive at `sin(WorldTime * 0.0015) * 0.4 + 0.6`. Only 0 (x6) and 81
 *    (x38) are placed. 81's UV scroll is already in `meshAnimation.ts`; the
 *    extra bright pass is a draw-order change.
 *  - The ambience. `PlayObjectSound` answers day 4 with
 *    `SOUND_EMPIREGUARDIAN_INDOOR_SOUND`
 *    (`Data/Sound/w69w70w71w72/ImperialGuardianFort_in.wav`,
 *    MapManager.cpp:830) on every call, i.e. a bed - the file is not in the
 *    sound catalogue. Music is handled centrally
 *    (`Music/ImperialGuardianFort`, the same track as days 1-3).
 *  - **158** (x11), `¿¬±â¹Ú½º_³ì.smd` ("smoke box, green") - :1099-1106
 *    spawns one `BITMAP_SMOKE` SubType 64 a tick, a green drifting plume
 *    (ZzzEffectParticle.cpp:1590-1604, :5803-5823). No `smoke64` kind exists
 *    and this folder may not add one; unlike 83/84/85 the box itself is not
 *    in the hidden list, so the model is drawn either way.
 */
export async function createEmpireGuardian4(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  bindAbsentModels(tiles, EMPIRE_GUARDIAN_4_ABSENT_MODELS);

  // `fSpeed *= 2/3/6` over the default, and the two explicit `o->Velocity`
  // writes (GMEmpireGuardian4.cpp:162-236). Day 3 is the only day that runs
  // 64 at 0.44; day 4 is 0.64 like days 1 and 2.
  tiles[20] = PlaySpeedObject.at(0.32);
  tiles[122] = PlaySpeedObject.at(0.48);
  tiles[123] = PlaySpeedObject.at(0.48);
  tiles[124] = PlaySpeedObject.at(0.48);
  tiles[128] = PlaySpeedObject.at(0.96);
  tiles[36] = PlaySpeedObject.at(0.02);
  tiles[64] = PlaySpeedObject.at(0.64);

  tiles[10] = EmpireGuardian4StartDelayObject;
  tiles[37] = EmpireGuardian4WallTorchObject;
  tiles[157] = EmpireGuardian4ChandelierObject;
}
