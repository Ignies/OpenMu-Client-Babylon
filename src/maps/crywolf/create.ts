import type { World } from '../../ecs/world';
import { CrywolfDomeObject, CrywolfVentObject } from './eventObjects';

/**
 * Crywolf Fortress (`WD_34CRYWOLF_1ST`, `World35`/`Object35`).
 *
 * `MoveCryWolf1stObject` (GMCrywolf1st.cpp:330-372) is the whole runtime:
 * three lights and three hidden markers (`spec.ts`), plus the event staging
 * in `eventObjects.ts` - the energy dome **81** (×1, 120.9/31.9) and the
 * smoke vents **74** and **84**, all reading `events/crywolf.ts`.
 *
 * Not built:
 *  - The three-state map: `EncTerrain351.att` / `352.att` and
 *    `TerrainLight1/2.jpg` for the occupied / at-war states (MapManager.cpp
 *    :1241-1256, :1341-1356) and `ChangeBackGroundMusic`'s
 *    `crywolf_before/ready/back` stingers (:268-320). The peace state is
 *    staged: `EncTerrain35.att`, `TerrainLight.OZJ`, `Music/crywolf1st`.
 *    OpenMU never runs the event, so the swaps would be dead paths today.
 *  - `M34CryWolf1st::CreateMist` (weather 2 only) — a weather recipe.
 *
 * `SOUND_CRY1ST_AMBIENT` (`w35/crywolf_ambi.wav`, loaded looping at
 * MapManager.cpp:193) is the bed in `ambientBeds.ts`.
 */
export async function createCrywolf(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  tiles[74] = CrywolfVentObject;
  tiles[81] = CrywolfDomeObject;
  tiles[84] = CrywolfVentObject;
}
