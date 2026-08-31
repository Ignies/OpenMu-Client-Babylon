import type { World } from '../../ecs/world';
import { AlphaObject } from '../shared/objectVariants';

/**
 * Barracks of Balgass (`WD_41CHANGEUP3RD_1ST`, `World42`/`Object42`) — the
 * 3rd class change quest's volcanic camp.
 *
 * `CGM3rdChangeUp::MoveObject` (GM3rdChangeUp.cpp:63-116) is shared with the
 * Refuge; its tables are in `spec.ts` here and imported by
 * `maps/balgasrefuge`. Per-object here: **78** (×2) `Alpha = 0.5`.
 *
 * Not built:
 *  - **84** (×0 placed): `Position[2] = terrainHeight + sin(t*0.0005)*150 -
 *    100` — a floating platform bob; nothing to bob.
 *  - `PlayEffectSound` (:352-371): `w42/cage01/02` on 74/75, `w42/volcano`
 *    on 79, `w42/firepillar` on 92 — positional loops, hook missing.
 *  - `CreateFireSnuff` (the leaves slot): embers in the air — a weather
 *    recipe.
 *
 * Music `Music/BalgasBarrack` (`PlayBGM`, :373-391).
 */
export async function createBalgasBarracks(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GM3rdChangeUp.cpp:100-102.
  tiles[78] = AlphaObject.at(0.5);
}
