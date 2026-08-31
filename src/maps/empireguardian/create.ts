import { ENUM_WORLD } from '../../common/types';
import type { World } from '../../ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';

/**
 * Fortress of Imperial Guardian (`WD_69EMPIREGUARDIAN1 … 4`, `World70…73`).
 * One module for the four days, the way Blood Castle is one for its floors.
 *
 * `CreateObject` (GMEmpireGuardian1.cpp:45-66 and the three copies): 129-132
 * normalise their yaw and cache it as `HeadAngle` (used by the event's
 * turning statues), 115/117 get `SubType = 100`, day 4's 10 gets a random
 * `SubType` countdown that restarts its animation. `MoveObject`: the play
 * speed multipliers — 20 at 2x, 122-124 at 3x, 128 at 6x, 36 at 0.02, 64 at
 * 0.64 (0.44 on day 3) — and the hidden list in `spec.ts`.
 *
 * Not built: the event itself (gates, bosses, `RenderFrontSideVisual`), the
 * weather-dependent ambience (`ImperialGuardianFort_out1/2/3.wav`,
 * `_in.wav` — not in the sound catalogue), `CreateRain` on days 1-3 (the
 * leaves slot — days 1-3 are `outdoor` on their entry so the weather layer's rain can
 * fall). `Music/ImperialGuardianFort` on all four.
 */
export async function createEmpireGuardian(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;
  const day3 = world.mapIndex === ENUM_WORLD.WD_71EMPIREGUARDIAN3;

  // `fSpeed *= 2/3/6` over the default 0.16.
  tiles[20] = PlaySpeedObject.at(0.32);
  tiles[122] = PlaySpeedObject.at(0.48);
  tiles[123] = PlaySpeedObject.at(0.48);
  tiles[124] = PlaySpeedObject.at(0.48);
  tiles[128] = PlaySpeedObject.at(0.96);
  tiles[36] = PlaySpeedObject.at(0.02);
  tiles[64] = PlaySpeedObject.at(day3 ? 0.44 : 0.64);
}
