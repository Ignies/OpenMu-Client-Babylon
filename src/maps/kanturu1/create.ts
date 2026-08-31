import type { World } from '../../ecs/world';
import { AlphaObject, PlaySpeedObject } from '../shared/objectVariants';

/**
 * Kanturu Ruins (`WD_37KANTURU_1ST`, `World38`/`Object38`).
 *
 * `MoveKanturu1stObject` (GM_kanturu_1st.cpp:41-125) is the runtime: the
 * hidden emitters and the brazier lights (`spec.ts`), the sines and the
 * waterfall scroll (`meshAnimation.ts`), and the per-object settings here:
 *
 *  - **44** (×22) `Velocity = 0.02`, **46** (×43) `Velocity = 0.01` (the
 *    great wheel, with its `BlendMeshLight` sine), **90** (×19) `Velocity =
 *    0.04`.
 *  - **76** (×10) and **96** (×1): `Alpha = 0.5`.
 *
 * Not built:
 *  - The object-attached loops — `SOUND_KANTURU_1ST_BG_WHEEL` on 46,
 *    `_WATERFALL` on 77, `_ELEC` on 92, `_PLANT` on 98 — are
 *    `PlayBuffer(sound)` with no position, i.e. they play at full volume for
 *    as long as the object is in the update set. The map bed
 *    `w37/kan_ruin_global` is in `ambientBeds.ts`; the four object loops
 *    need a positional-loop hook the sound system does not have yet.
 *  - 92's `CreateJoint` lightning between bones 1 and 2 (:213-225; no ribbon
 *    primitive — the same gap as Icarus), 85's chrome pass (:202-212), 96's
 *    alpha-test tweak (:226-236), and the butterflies on 37.
 *
 * Music `Music/kanturu_1st`.
 */
export async function createKanturu1(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GM_kanturu_1st.cpp:60-63, :64-69, :101-103.
  tiles[44] = PlaySpeedObject.at(0.02);
  tiles[46] = PlaySpeedObject.at(0.01);
  tiles[90] = PlaySpeedObject.at(0.04);
  // :89-91, :104-106.
  tiles[76] = AlphaObject.at(0.5);
  tiles[96] = AlphaObject.at(0.5);
}
