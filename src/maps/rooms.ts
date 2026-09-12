import type { ENUM_WORLD } from '../common/types';
import { parseTerrainObjects } from '../common/terrain/parseTerrainObjects';
import { downloadDataBytesBuffer } from '../common/utils';
import { assetWorldNum } from '../common/worldAssets';
import { setAreaMood } from '../scenes/sceneLook';
import { roomVolumeOf, type AreaLookName } from '../lighting/profiles';
import type { World } from '../ecs/world';
import type { RoomFrame, RoomRecord, RoomSpec } from './roomEnumeration';

export { enumerateRooms, sameRoom } from './roomEnumeration';
export type { RoomFrame, RoomRecord, RoomSpec } from './roomEnumeration';

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
 * One trigger per room: the box the mask and the roof lift read is the
 * trigger's own, the floor between the inner wall faces, so a hero anywhere
 * on it - walked in, warped in, stepped in across a corner - is in the room
 * and a step into the doorway is out.
 */
/** Roof and wall types of every room registered on a map. */
const structureTypes = new Map<ENUM_WORLD, Set<number>>();

const NO_TYPES: ReadonlySet<number> = new Set();

/**
 * The object types a map's rooms are built from: the pieces the map lifts
 * out of the way (`transform.posOffset`) or the ceiling fade thins. They
 * keep a model of their own, so the prop batches leave them alone.
 */
export function roomStructureTypes(map: ENUM_WORLD): ReadonlySet<number> {
  return structureTypes.get(map) ?? NO_TYPES;
}

export function registerRooms(
  world: World,
  rooms: readonly RoomFrame[],
  spec: RoomSpec,
  hooksFor: (room: RoomFrame) => RoomHooks
): void {
  const map = world.mapIndex;

  const structure = structureTypes.get(map) ?? new Set<number>();
  for (const type of spec.roofTypes) structure.add(type);
  for (const type of spec.wallTypes) structure.add(type);
  structureTypes.set(map, structure);

  for (const room of rooms) {
    const hooks = hooksFor(room);
    const volume = roomVolumeOf(room.min, room.max, {
      floorY: room.base,
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
