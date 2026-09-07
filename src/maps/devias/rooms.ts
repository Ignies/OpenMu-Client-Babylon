/**
 * The lit interiors of Devias, footprints as `maps/rooms.ts` enumerates them
 * from EncTerrain3.obj (tiles). Plain data so the ambient particle system can
 * import it without pulling the map module (and its scene imports) along.
 *
 * Every Devias house is tiled the same way: a type-76 corner post on each
 * corner, wall pieces (77/78/79) whose origin sits on the post line with the
 * body one tile outward, and roof slabs (81/82) over the lot. A room's bounds
 * are the floor between the inner wall faces, half a tile out from the post
 * line. The same box is the area's frame (create.ts), the roof mask's
 * fallback paint (terrainMaskSystem) and the dust volume, so the three cannot
 * disagree.
 *
 * The two castle halls are interiors as well, tiled from a taller kit of
 * their own: `DEVIAS_CASTLE_SPEC` below.
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
 * The two castle halls, which are interiors too and are tiled from their own
 * kit rather than the houses': a 4x4 slab roof (99 black castle / 98 white
 * castle, Object100 / Object99), castle wall pieces (17/18 black, 15/16
 * white), the halls' own inner walls (62/63 black, 33/34 white) and the round
 * pillars of the colonnades (61 black, 90 white). The kit stands one storey
 * taller than a house: pillars top out 3.15 over the wall base and the roof's
 * underside sits at 3.21, against 2.64 and 2.70 for a house, so the halls need
 * their own spec and cannot share `DEVIAS_ROOM_SPEC`.
 *
 * The wall body is centred on its line here (a house's stands one tile
 * outward), so the floor is half a tile IN from the line rather than out.
 *
 * The heights carry a 0.2 allowance the houses do not need. `base` is the
 * lowest matched wall, and a hall's set reaches out to curtain-wall pieces
 * standing on the slope outside it (black hall base 1.42, white 1.57, both
 * against a 1.65 floor). Measured absolutes: roof underside 4.85, pillar tops
 * 4.80, the highest banner 4.98. Rounding both heights up puts the volume's
 * ceiling over the banners instead of cutting their tops off, and still
 * leaves the roof slabs above `roofY - ROOF_SLACK` so the ceiling lift finds
 * them.
 */
export const DEVIAS_CASTLE_SPEC: RoomSpec = {
  roofTypes: [98, 99],
  roofHalf: 2,
  wallTypes: [15, 16, 17, 18, 33, 34, 61, 62, 63, 90],
  floorFromWallLine: 0.5,
  wallHeight: 3.3,
  roofHeight: 3.6,
};

/**
 * Black castle, north-west: the throne hall inside the curtain wall. Roof
 * slabs on a 4-tile grid over (9.5,16)-(29.5,36), a colonnade of type-61
 * pillars down y 18.5 and y 33.5, the throne (21) on the west wall at
 * (10,26) and eight wall candelabra (56) along it.
 */
export const DEVIAS_BLACK_CASTLE_HALL: Room = {
  min: { x: 9, y: 16 },
  max: { x: 29, y: 36 },
  centre: { x: 19, z: 26 },
};

/**
 * White castle, south-east: the same hall in the white kit. Roof over
 * (216,223)-(236,239), pillars (90) down x 218.5 and x 233.5, the throne (64)
 * at (226,238) with four candelabra (56) on the y 235 wall.
 */
export const DEVIAS_WHITE_CASTLE_HALL: Room = {
  min: { x: 216, y: 224 },
  max: { x: 235, y: 240 },
  centre: { x: 225.5, z: 232 },
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
  DEVIAS_BLACK_CASTLE_HALL,
  DEVIAS_WHITE_CASTLE_HALL,
];
