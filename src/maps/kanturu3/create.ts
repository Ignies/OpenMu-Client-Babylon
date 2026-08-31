import { MapTileObject } from '../../common/mapTileObject';
import type { Entity, World } from '../../ecs/world';

/**
 * `CreateKanturu3rdObject` case 0 (GM_Kanturu_3rd.cpp:99-101):
 * `o->Position[2] -= 2000.0f` — the one type-0 record (the Nightmare's
 * tower, at 193/87, scale 1.98) is sunk 20 tiles below where the .obj puts
 * it, so its top sits at ground level until the boss raises it.
 */
const TOWER_SINK_TILES = 20;

class Kanturu3TowerObject extends MapTileObject {
  async init(world: World, entity: Entity): Promise<void> {
    if (entity.transform) {
      entity.transform.posOffset = { x: 0, y: -TOWER_SINK_TILES, z: 0 };
    }
    await super.init(world, entity);
  }
}

/**
 * Kanturu Remain (`WD_39KANTURU_3RD`, `World40`/`Object40`) — the Nightmare's
 * tower.
 *
 * `spec.ts` carries the seventeen hidden types, the steam and the arc
 * lights. This file is the tower offset above.
 *
 * Not built:
 *  - The boss fight: `M39Kanturu3rd`'s Maya / Nightmare states, the
 *    `EncTerrain401.att` swap on `IsSuccessBattle()` (MapManager.cpp:1259)
 *    and `ChangeBackGroundMusic` (:1744-1777) switching between
 *    `KanturuTower`, `KanturuMayaBattle` and `KanturuNightmareBattle` — all
 *    server state. The idle state is staged: `EncTerrain40.att` and
 *    `Music/KanturuTower`.
 *  - Type 0's render special-case (:207-256): the tower is drawn with mesh
 *    0 unhidden and a bone-34 smoke column only while the Maya scene runs.
 *  - The object loops (`kan_boss_incubator` on 25, `_crystal` on 40/41/42,
 *    `_gear` on 71, `_field` on 73) — positional-loop hook missing. The bed
 *    `w39/kan_boss_global` is in `ambientBeds.ts`.
 */
export async function createKanturu3(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  tiles[0] = Kanturu3TowerObject;
}
