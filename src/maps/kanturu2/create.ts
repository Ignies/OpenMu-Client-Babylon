import { OperateBoxObject } from '../../common/operateBoxObject';
import type { World } from '../../ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';

/**
 * Kanturu Relics (`WD_38KANTURU_2ND`, `World39`/`Object39`).
 *
 * `Create_Kanturu2nd_Object` (GM_Kanturu_2nd.cpp:34-49): type 3 (×9) is
 * `CreateOperate` — the healing / entry pads. `Move_Kanturu2nd_Object`
 * (:212-272): 10 (×21) `Velocity = 0.04` with a clamped `BlendMeshLight`
 * sine, 44 (×3) `Velocity = 0.02`; the rest are the hidden steam types in
 * `spec.ts` and the sines/scroll in `meshAnimation.ts`.
 *
 * Not built: the object loops (`kan_relic_gear` on 9, `kan_relic_incubator`
 * on 31/35/36/37 — `Sound_Kanturu2nd_Object`, :194-210) which need a
 * positional-loop hook; 55's `MODEL_FENRIR_THUNDER`; the Gateway Machine NPC
 * and the trap cannons, which are server characters. The map bed
 * `w38/kan_relic_global` and `Music/kanturu_2nd` are in the sound tables.
 */
export async function createKanturu2(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GM_Kanturu_2nd.cpp:41-45.
  tiles[3] = OperateBoxObject;
  // :219-231, :242-245.
  tiles[10] = PlaySpeedObject.at(0.04);
  tiles[44] = PlaySpeedObject.at(0.02);
}
