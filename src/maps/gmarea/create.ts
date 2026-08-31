import type { World } from '../../ecs/world';
import { AlphaObject, PlaySpeedObject } from '../shared/objectVariants';

/**
 * The GM area (`WD_40AREA_FOR_GM`, `World41`/`Object41`) — a 670-object
 * test field built from the Kanturu Ruins art (Object41 is 39 of Object38's
 * models). There is no map code of its own: `MoveKanturu1stObject` runs here
 * too (`IsKanturu1st() || M40GMArea::IsGmArea()`, GM_kanturu_1st.cpp:43),
 * so the Kanturu 1st tables are registered for this world in every registry
 * (`maps/kanturu1/spec.ts`) and the same two per-object settings apply —
 * of which only 44 is placed at all (none of 46/76/90/96 exist here).
 *
 * No `ManageBackgroundMusic` case and no `PlayWorldAmbientSounds` case:
 * silent, deliberately (`null` in `music.ts`). Not an OpenMU map, so the
 * offline spawn is a walkable cell in the ruins cluster (228,26) — the
 * map has 693 walkable cells, all there.
 */
export async function createGmArea(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  tiles[44] = PlaySpeedObject.at(0.02);
  tiles[46] = PlaySpeedObject.at(0.01);
  tiles[90] = PlaySpeedObject.at(0.04);
  tiles[76] = AlphaObject.at(0.5);
  tiles[96] = AlphaObject.at(0.5);
}
