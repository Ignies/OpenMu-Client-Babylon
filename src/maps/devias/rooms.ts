/**
 * The lit interiors of Devias, footprints as `maps/rooms.ts` enumerates them
 * from EncTerrain3.obj (tiles). Plain data so the ambient particle system can
 * import it without pulling the map module (and its scene imports) along.
 *
 * Every Devias building is tiled the same way: a type-76 corner post on each
 * corner, wall pieces (77/78/79) whose origin sits on the post line with the
 * body one tile outward, and roof slabs (81/82) over the lot. A room's bounds
 * are the floor between the inner wall faces, half a tile out from the post
 * line. The same box is the area's frame (create.ts), the roof mask's
 * fallback paint (terrainMaskSystem) and the dust volume, so the three cannot
 * disagree.
 *
 *  - Tavern: posts (225.5,20.5)-(236.5,27.5). Bar counter with the bottle
 *    shelves on the north wall, barrels in the west corner, the fireplace (36
 *    with its 66 fire) on the east wall at (232, 27.5), benches (40) and
 *    tables with mugs, two wall candelabra (54) by the door at x 227.5.
 *  - Reading room: posts (204.5,12.5)-(215.5,31.5). Desk (94) and bookshelves
 *    (53), notice boards (97) flush on the x 204 and y 32 walls, four
 *    standing candelabra (56) by the desk, two more (54) on the x 204 wall,
 *    rows of benches (22) and tables (25), the door (88/65) on the x 216 wall.
 */
import type { Room } from '../layer';
import type { RoomSpec } from '../roomEnumeration';

export type { Room } from '../layer';

/** Measured on the tavern: log wall 0.34 thick on a one-tile stone base, top face 2.64 over the base, roof underside 2.70. */
export const DEVIAS_ROOM_SPEC: RoomSpec = {
  roofTypes: [81, 82],
  roofHalf: 2.3,
  wallTypes: [76, 77, 78, 79],
  floorFromWallLine: -0.5,
  wallHeight: 2.62,
  roofHeight: 2.7,
};

export const DEVIAS_TAVERN: Room = {
  min: { x: 225, y: 20 },
  max: { x: 237, y: 28 },
  centre: { x: 231, z: 24 },
};

export const DEVIAS_READING_ROOM: Room = {
  min: { x: 204, y: 12 },
  max: { x: 216, y: 32 },
  centre: { x: 210, z: 22 },
};

/**
 * The two other fireplace houses, found the same way: a type-36 hearth with
 * its type-66 fire on a wall inside the posts.
 *
 *  - West house: posts (202.5,55.5)-(207.5,62.5); hearth on the west wall
 *    at (202.5, 62), scale 0.78. Benches (81) at the four inner corners,
 *    tables (77/78/79), a shelf (96) beside the fire.
 *  - East house: posts (224.5,37.5)-(231.5,44.5); hearth in the south-west
 *    corner at (225, 44.5), scale 0.70. Bench (40), curtains (95), tables.
 *
 * Neither has a candelabra, so the hearth is the only light in the room.
 */
export const DEVIAS_WEST_HEARTH_HOUSE: Room = {
  min: { x: 202, y: 55 },
  max: { x: 208, y: 63 },
  centre: { x: 205, z: 59 },
};

export const DEVIAS_EAST_HEARTH_HOUSE: Room = {
  min: { x: 224, y: 37 },
  max: { x: 232, y: 45 },
  centre: { x: 228, z: 41 },
};

/** The guard room west of the spawn: posts (186.5,43.5)-(193.5,50.5), guards, barrels, round shields on the walls. */
export const DEVIAS_GUARD_ROOM: Room = {
  min: { x: 186, y: 43 },
  max: { x: 194, y: 51 },
  centre: { x: 190, z: 47 },
};

/**
 * Every Devias interior with a row of its own. The ambient dust picks rooms
 * out of this individually (each has its own recipe); the terrain mask paints
 * all of them as roofed, so settled snow stops at their doors even before
 * the buildings' own geometry has streamed in.
 */
export const DEVIAS_ROOMS: readonly Room[] = [
  DEVIAS_TAVERN,
  DEVIAS_READING_ROOM,
  DEVIAS_WEST_HEARTH_HOUSE,
  DEVIAS_EAST_HEARTH_HOUSE,
  DEVIAS_GUARD_ROOM,
];
