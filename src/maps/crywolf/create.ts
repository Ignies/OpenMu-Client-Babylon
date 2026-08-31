import type { World } from '../../ecs/world';
import { AlphaObject } from '../shared/objectVariants';

/**
 * Crywolf Fortress (`WD_34CRYWOLF_1ST`, `World35`/`Object35`).
 *
 * `MoveCryWolf1stObject` (GMCrywolf1st.cpp:330-372) is the whole runtime:
 * three lights and three hidden markers (`spec.ts`) and one alpha —
 * **81** (×1, 120.9/31.9), `o->Alpha = 0.2f`, the altar's energy dome.
 *
 * Not built:
 *  - The three-state map: `EncTerrain351.att` / `352.att` and
 *    `TerrainLight1/2.jpg` for the occupied / at-war states (MapManager.cpp
 *    :1241-1256, :1341-1356) and `ChangeBackGroundMusic`'s
 *    `crywolf_before/ready/back` stingers (:268-320) — all driven by
 *    `M34CryWolf1st::IsCryWolf1stMVPStart()`, i.e. server state the clone
 *    does not receive. The peace state is staged: `EncTerrain35.att`,
 *    `TerrainLight.OZJ`, `Music/crywolf1st`.
 *  - `M34CryWolf1st::CreateMist` (weather 2 only) — a weather recipe.
 *  - The MVP interface and the notice board (:224, :2188+).
 *
 * `SOUND_CRY1ST_AMBIENT` (`w35/crywolf_ambi.wav`, loaded looping at
 * MapManager.cpp:193) is the bed in `ambientBeds.ts`.
 */
export async function createCrywolf(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GMCrywolf1st.cpp:358-360.
  tiles[81] = AlphaObject.at(0.2);
}
