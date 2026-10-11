import { describe, expect, it } from 'vitest';
import { enumerateRooms, sameRoom, type RoomRecord, type RoomSpec } from './roomEnumeration';

// The Devias building kit as EncTerrain3.obj lays it out: corner posts and
// wall pieces on the post line, 4-tile roof slabs over the lot.
const DEVIAS: RoomSpec = {
  roofTypes: [81, 82],
  roofHalf: 2.3,
  wallTypes: [76, 77, 78, 79],
  floorFromWallLine: -0.5,
  wallHeight: 2.65,
  roofHeight: 2.7,
};

const at = (id: number, x: number, y: number, z = 1.7): RoomRecord => ({ id, x, y, z });

/** The tavern: posts (225.5,20.5)-(236.5,27.5), six slabs in two rows. */
const TAVERN: RoomRecord[] = [
  at(76, 225.5, 20.5), at(76, 225.5, 27.5), at(76, 236.5, 20.5), at(76, 236.5, 27.5),
  at(77, 228, 20.5), at(78, 232, 20.5), at(78, 236.5, 23), at(77, 225.5, 25),
  at(81, 227, 22), at(82, 231, 22), at(81, 235, 22),
  at(81, 227, 26), at(82, 231, 26), at(81, 235, 26),
];

describe('enumerateRooms', () => {
  it('reads a building off its roof slabs and wall line', () => {
    const rooms = enumerateRooms(TAVERN, DEVIAS);

    expect(rooms).toEqual([
      { min: { x: 225, y: 20 }, max: { x: 237, y: 28 }, centre: { x: 231, z: 24 }, base: 1.7 },
    ]);
  });

  it('takes the base from the lowest wall', () => {
    const [room] = enumerateRooms([...TAVERN, at(77, 234, 27.5, 1.62)], DEVIAS);

    expect(room.base).toBe(1.62);
  });

  it('keeps two buildings apart when their slabs do not touch', () => {
    const shed = [at(76, 245.5, 20.5), at(76, 249.5, 20.5), at(81, 247.5, 22)];
    const rooms = enumerateRooms([...TAVERN, ...shed], DEVIAS);

    expect(rooms.map(r => r.centre.x)).toEqual([231, 247.5]);
  });

  it('ignores a roof with no wall under it', () => {
    expect(enumerateRooms([at(81, 100, 100), at(81, 104, 100)], DEVIAS)).toEqual([]);
  });

  it('does not chain a roof on another storey', () => {
    const upper = [at(81, 231, 22, 5.5), at(76, 229.5, 20.5, 5.5), at(76, 232.5, 23.5, 5.5)];
    const rooms = enumerateRooms([...TAVERN, ...upper], DEVIAS);

    expect(rooms).toHaveLength(2);
  });

  it('matches an enumerated room to a known row by centre', () => {
    const [room] = enumerateRooms(TAVERN, DEVIAS);

    expect(sameRoom(room, { min: { x: 226, y: 21 }, max: { x: 236, y: 27 }, centre: { x: 231, z: 24 } })).toBe(true);
    expect(sameRoom(room, { min: { x: 204, y: 12 }, max: { x: 216, y: 32 }, centre: { x: 210, z: 22 } })).toBe(false);
  });
});
