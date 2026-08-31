import { ENUM_WORLD } from '../../common/types';
import {
  flushTerrainMask,
  paintRoof,
  resetTerrainMask,
} from '../../libs/mu/terrainMask';
import { needsTerrainMask } from '../../libs/mu/terrainOverlay';
import { DEVIAS_ROOMS } from '../../maps/devias/rooms';
import type { ISystemFactory } from '../world';

/**
 * Keeps the terrain mask (`terrainMask.ts`) up to date: which tiles have a roof
 * over them, so the ground overlays — settled snow today — stop at the door.
 *
 * Nothing in the map data says where an interior is (see the note in
 * terrainMask.ts: the shipped `.att` files carry no `TW_HEIGHT` at all), so a
 * roof has to be recognised by its shape. The test is the one
 * `CeilingHideSystem` already proved for finding the ceiling over the hero — a
 * mesh whose world AABB is a thin slab sitting above head height — applied to
 * every loaded object rather than a radius around the player.
 *
 * ### Why it scans continuously instead of once
 *
 * Objects stream in with the player, so at map load most of the world's
 * geometry does not exist yet and a single pass would see almost nothing.
 * Because painting is additive, a continuous scan converges on exactly the
 * right answer wherever the player has been — and the only place that matters
 * is where they can see the ground. Each entity is measured **once** and then
 * skipped forever, so the steady-state cost is walking the entity list, not
 * its meshes.
 *
 * Measuring once also quietly handles the Lorencia pub, whose roof is lifted
 * 100 units out of view while the hero is inside it: the roof is measured on
 * the approach, and the lift afterwards cannot un-measure it.
 *
 * ### Only the map's own geometry is ever measured
 *
 * The query is keyed on `modelId`, which `loadMapIntoScene.createObjects`
 * sets and nothing else in the game does — so it holds exactly the objects
 * the map file placed, and never a player, a monster, an NPC or a dropped
 * item.
 *
 * That is not tidiness, it is a fix. A **fresh drop** is created 180 cm up
 * and thrown a further ~44 cm by `DropMotionSystem`, then falls for about
 * half a second: for that half second it is a thin mesh hanging 1.8–2.2
 * tiles over the ground, which is precisely the slab test below. Whichever
 * scan caught it painted the item's tumbling world AABB as a roof — and
 * because painting is additive and each entity is measured once, every item
 * that ever fell left a permanent square of bare ground in the snow under it.
 * Living bodies are out for the same reason: nothing that can be somewhere
 * else a second later has any business deciding what the sky over a tile is.
 */

/** Slab bottom this far (tiles) above the ground under it. Clears a head. */
const ABOVE_GROUND = 1.6;

/** Thicker boxes are tree crowns, towers and cliffs, not ceilings. */
const MAX_THICKNESS = 2.5;

/** A roof more than this far up is a spire, and shelters nothing below it. */
const MAX_HEIGHT = 6;

/** Seconds between scans. The mask only has to be right before snow builds. */
const SCAN_INTERVAL = 0.5;

/** Mid-map tile, used only to ask whether terrain height is loaded yet. */
const TERRAIN_PROBE = 128;

export const TerrainMaskSystem: ISystemFactory = world => {
  // `modelId` is the map file's object id, set only by `createObjects`. It is
  // what separates the world's own geometry from everything that walks, flies
  // or falls through it — see the note above.
  const models = world.with('modelObject', 'transform', 'worldIndex', 'modelId');
  const areas = world.with('interactiveArea', 'worldIndex');

  /** Entities already measured; their geometry does not move. */
  let measured = new WeakSet<object>();

  let lastMap: ENUM_WORLD | null = null;
  let sinceScan = SCAN_INTERVAL;

  /**
   * The interiors the game already knows by name — every registered
   * `interactiveArea`, plus the Devias rooms that are data-only. Painted
   * unconditionally, because these are the rooms a player is most likely to be
   * standing in when the map loads and no roof has streamed in yet.
   */
  function paintKnownInteriors(map: ENUM_WORLD) {
    for (const e of areas) {
      if (e.worldIndex !== map) continue;
      const { min, max } = e.interactiveArea;
      paintRoof({ minX: min.x, maxX: max.x, minZ: min.y, maxZ: max.y });
    }

    if (map === ENUM_WORLD.WD_2DEVIAS) {
      for (const room of DEVIAS_ROOMS) {
        paintRoof({
          minX: room.min.x,
          maxX: room.max.x,
          minZ: room.min.y,
          maxZ: room.max.y,
        });
      }
    }
  }

  function scanRoofs(map: ENUM_WORLD) {
    // `World.getTerrainHeight` answers -9999 until the map's height data is
    // installed. Measuring against that would put every roof's clearance in
    // the thousands, and since an entity is only ever measured once, the
    // whole map would be permanently unroofed. Wait instead.
    if (world.getTerrainHeight(TERRAIN_PROBE, TERRAIN_PROBE) <= -9000) return;

    for (const e of models) {
      if (e.worldIndex !== map) continue;
      if (measured.has(e)) continue;

      const mo = e.modelObject;
      if (!mo.Ready || !mo.gltf) continue;

      // Ready and measured: never look at this one again, whatever it turned
      // out to be. A building does not grow a roof later.
      measured.add(e);

      for (const mesh of mo.gltf.mesh.getChildMeshes(false)) {
        if (mesh.metadata?.SkipBoundingBox) continue;
        if (mesh.getTotalVertices() === 0) continue;

        const box = mesh.getBoundingInfo().boundingBox;
        const min = box.minimumWorld;
        const max = box.maximumWorld;

        if (max.y - min.y > MAX_THICKNESS) continue;

        const ground = world.getTerrainHeight(
          (min.x + max.x) * 0.5,
          (min.z + max.z) * 0.5
        );

        const clearance = min.y - ground;
        if (clearance < ABOVE_GROUND || clearance > MAX_HEIGHT) continue;

        paintRoof({
          minX: min.x,
          maxX: max.x,
          minZ: min.z,
          maxZ: max.z,
        });
      }
    }
  }

  return {
    update: dt => {
      const map = world.mapIndex;

      if (map !== lastMap) {
        lastMap = map;
        measured = new WeakSet();
        resetTerrainMask();
        sinceScan = SCAN_INTERVAL;
      }

      // Only maps with a ground overlay pay for any of this.
      if (!needsTerrainMask(map)) return;

      sinceScan += dt;
      if (sinceScan < SCAN_INTERVAL) return;
      sinceScan = 0;

      paintKnownInteriors(map);
      scanRoofs(map);
      flushTerrainMask();
    },
  };
};
