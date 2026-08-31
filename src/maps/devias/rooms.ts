/**
 * The two lit interiors by the Devias spawn (219, 24), footprints read off
 * EncTerrain3.obj (tiles). Plain data so the ambient particle system can
 * import it without pulling the map module (and its scene imports) along.
 *
 *  - Tavern: x 225.5-236.5, y 20.5-28. Bar counter with the bottle shelves
 *    on the north wall, barrels in the west corner, the fireplace (36 with
 *    its 66 fire) on the east wall at (232, 27.5), benches (40) and tables
 *    with mugs, two wall candelabra (54) by the door at x 227.5.
 *  - Reading room: x 204.5-215.5, y 12.5-30. Desk (94) and bookshelves
 *    (53), notice boards, four standing candelabra (56) by the desk, two
 *    more (54) on the west wall, rows of benches (22) and tables (25).
 */
import type { Room } from '../layer';

export type { Room } from '../layer';

export const DEVIAS_TAVERN: Room = {
  min: { x: 226, y: 21 },
  max: { x: 236, y: 27.5 },
  centre: { x: 231, z: 24.25 },
};

export const DEVIAS_READING_ROOM: Room = {
  min: { x: 205, y: 13 },
  max: { x: 215, y: 29.5 },
  centre: { x: 210, z: 21.25 },
};

/**
 * The two other fireplace houses, both found the same way: EncTerrain3.obj
 * puts a type-76 corner post on each corner of every Devias building, and a
 * type-36 hearth with its type-66 fire on the wall inside. Room bounds are
 * the corner rectangle pulled in half a tile on the min side, matching how
 * DEVIAS_TAVERN was derived from its own 76s at (225.5,20.5)-(236.5,27.5).
 *
 *  - West house: corners (202.5,55.5)-(207.5,62.5); hearth on the west wall
 *    at (202.5, 62), scale 0.78. Benches (81) at the four inner corners,
 *    tables (77/78/79), a shelf (96) beside the fire.
 *  - East house: corners (224.5,37.5)-(231.5,44.5); hearth in the south-west
 *    corner at (225, 44.5), scale 0.70. Bench (40), curtains (95), tables.
 *
 * Neither has a candelabra, so the hearth is the only light in the room.
 */
export const DEVIAS_WEST_HEARTH_HOUSE: Room = {
  min: { x: 203, y: 56 },
  max: { x: 207.5, y: 62.5 },
  centre: { x: 205.25, z: 59.25 },
};

export const DEVIAS_EAST_HEARTH_HOUSE: Room = {
  min: { x: 225, y: 38 },
  max: { x: 231.5, y: 44.5 },
  centre: { x: 228.25, z: 41.25 },
};

/**
 * Every enumerated Devias interior. The ambient dust picks rooms out of this
 * individually (each has its own recipe); the terrain mask paints all of them
 * as roofed, so settled snow stops at their doors even before the buildings'
 * own geometry has streamed in.
 */
export const DEVIAS_ROOMS: readonly Room[] = [
  DEVIAS_TAVERN,
  DEVIAS_READING_ROOM,
  DEVIAS_WEST_HEARTH_HOUSE,
  DEVIAS_EAST_HEARTH_HOUSE,
];
