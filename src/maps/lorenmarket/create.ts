import { LeanBoxObject } from '../../common/operateBoxObject';
import type { World } from '../../ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';

/**
 * Loren Market (`WD_79UNITEDMARKETPLACE`, `World80`/`Object80`) — the
 * trading square.
 *
 * `GMUnitedMarketPlace::CreateObject` (GMUnitedMarketPlace.cpp:45-58): 67 is
 * `CreateOperate` + `BoundingBoxMax (100, 100, 160)` + hidden — a lean box
 * (the width is 100 rather than 40; `LeanBoxObject` keeps 40). `MoveObject`
 * (:82-236): 8 (×1, the fountain `chofountain01`) `Velocity = 0.2`; the
 * lamps and fountain spray in `spec.ts`.
 *
 * Sound: `PlayWorldAmbientSounds` (SceneManager.cpp:623-628) plays `aWind`
 * *and* `aRain` here unconditionally, and `StopInactiveAmbientSounds` spares
 * both — it always rains in the market (`g_UnitedMarketPlace.CreateRain`),
 * so the world joins `OUTDOOR`. `PlayBGM` is commented out (:502-508): no
 * music, `null`.
 *
 * Not built: the NPC visuals on Julia / Christin / Raul (:158-230,
 * :355-400 — bone sprites on server characters).
 */
export async function createLorenMarket(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GMUnitedMarketPlace.cpp:49-55.
  tiles[67] = LeanBoxObject;
  // :93-96.
  tiles[8] = PlaySpeedObject.at(0.2);
}
