import { ENUM_WORLD } from '../../core/types';
import {
  flushTerrainMask,
  isRoofSlab,
  paintRoof,
  resetTerrainMask,
} from '../../controllers/terrain/terrainMask';
import { needsTerrainMask } from '../../controllers/terrain/terrainOverlay';
import { DEVIAS_ROOMS } from '@versions/shared/maps/devias/rooms';
import type { ISystemFactory } from '../world';

/**
 * Keeps the terrain mask (`terrainMask.ts`) up to date: which tiles have a
 * roof over them, so ground overlays stop at the door. See ecs/readme.md.
 */

/** Seconds between scans. The mask only has to be right before snow builds. */
const SCAN_INTERVAL = 0.5;

/** Mid-map tile, used only to ask whether terrain height is loaded yet. */
const TERRAIN_PROBE = 128;

export const TerrainMaskSystem: ISystemFactory = world => {
  // `modelId` is the map file's object id, set only by `createObjects`. It is
  // what separates the world's own geometry from everything that walks, flies
  // or falls through it - see the note above.
  const models = world.with('modelObject', 'transform', 'worldIndex', 'modelId');
  const areas = world.with('interactiveArea', 'worldIndex');

  /** Entities already measured; their geometry does not move. */
  let measured = new WeakSet<object>();

  let lastMap: ENUM_WORLD | null = null;
  let sinceScan = SCAN_INTERVAL;

  /**
   * The interiors the game already knows by name - every registered
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

        const ground = world.getTerrainHeight(
          (min.x + max.x) * 0.5,
          (min.z + max.z) * 0.5
        );

        if (!isRoofSlab(min.y, max.y, ground)) continue;

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
