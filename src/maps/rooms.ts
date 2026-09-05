import type { ENUM_WORLD } from '../common/types';
import { parseTerrainObjects } from '../common/terrain/parseTerrainObjects';
import { downloadDataBytesBuffer } from '../common/utils';
import { assetWorldNum } from '../common/worldAssets';
import { setAreaMood } from '../scenes/sceneLook';
import { roomVolumeOf, type AreaLookName } from '../lighting/profiles';
import type { World } from '../ecs/world';
import type { Room } from './layer';
import type { RoomRecord, RoomSpec } from './roomEnumeration';

export { enumerateRooms, sameRoom } from './roomEnumeration';
export type { RoomRecord, RoomSpec } from './roomEnumeration';

/**
 * The map's object records in tiles, from the same file the terrain loader
 * reads (a cache hit by the time a map's `create` runs).
 */
export async function loadRoomRecords(map: ENUM_WORLD): Promise<RoomRecord[]> {
  const worldNum = assetWorldNum(map);
  const bytes = await downloadDataBytesBuffer(
    `World${worldNum}/EncTerrain${worldNum}.obj`
  );

  return parseTerrainObjects(bytes).map(o => ({
    id: o.id,
    x: o.pos.x / 100,
    y: o.pos.y / 100,
    z: o.pos.z / 100,
  }));
}

export type RoomHooks = {
  readonly look: AreaLookName;
  readonly onEnter?: () => void;
  readonly onLeave?: () => void;
};

/**
 * One trigger per room: the frame the mask and the roof lift read is the
 * trigger's own box, so a hero on any tile inside it - walked in, warped in,
 * stepped in across a corner - is in the room, and a step past the wall line
 * is out.
 */
export function registerRooms(
  world: World,
  rooms: readonly Room[],
  spec: RoomSpec,
  hooksFor: (room: Room) => RoomHooks
): void {
  const map = world.mapIndex;

  for (const room of rooms) {
    const hooks = hooksFor(room);
    const volume = roomVolumeOf(room.min, room.max, {
      floorY: world.getTerrainHeight(room.centre.x, room.centre.z),
      wallHeight: spec.wallHeight,
      roofHeight: spec.roofHeight,
    });

    world.add({
      worldIndex: map,
      interactiveArea: {
        min: { x: volume.minX, y: volume.minY },
        max: { x: volume.maxX, y: volume.maxY },
        onEnter: () => {
          hooks.onEnter?.();
          setAreaMood(hooks.look, volume);
        },
        onLeave: () => {
          hooks.onLeave?.();
          setAreaMood(null);
        },
      },
    });
  }
}
