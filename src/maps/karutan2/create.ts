import type { World } from '../../ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';

/**
 * Karutan 2 (`WD_81KARUTAN2`, `World82`/`Object82`) - Kardamahal's canyon.
 *
 * The same loader block as Karutan 1 - `IsKarutanMap()` covers both worlds
 * (MapManager.cpp:1164-1172, GMKarutan1.cpp:876-879) - so type 107 is bound
 * the same way. Type 66 is the other half of that block and is left out: it
 * takes a class (`maps/karutan1/insectObject.ts`) and `EncTerrain82.obj`
 * places none of it, nor of 1, 58, 63 or 119.
 *
 *  - **107** (×3): `Models[107].Actions[0].PlaySpeed = 5.f`, reaching the
 *    object through `RenderObject`'s swap of `o->Velocity` for the action's
 *    `PlaySpeed` on 66 and 107 (ZzzObject.cpp:3696-3701).
 *
 * Everything else is table data in `maps/karutan1/spec.ts`, which both
 * worlds share; the omissions listed in `maps/karutan1/create.ts` apply
 * here too.
 *
 * Beds `Karutan_desert_env` / `Kardamahal_entrance_env` (the second on tile
 * 12 alone, SceneManager.cpp:947-958), music `Music/Karutan_B`. No object
 * loop: `SOUND_KARUTAN_INSECT_ENV` is stopped on every world but Karutan 1
 * (:1015-1016).
 */
export async function createKarutan2(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  tiles[107] = PlaySpeedObject.at(5);
}
