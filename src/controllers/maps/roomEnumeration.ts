import type { Room } from './layer';

/**
 * Every roofed building the hero can walk into, read off the map's object
 * list rather than listed by hand (§13 F10): the roof slabs are grouped into
 * buildings by touching, and the wall pieces standing under each roof give the
 * room its frame. Pure: `rooms.ts` feeds it the records and registers what it
 * finds.
 */

export type RoomSpec = {
  /** Object types that are a roof slab. */
  readonly roofTypes: readonly number[];
  /** Half the slab's footprint, tiles; two slabs closer than a full slab touch. */
  readonly roofHalf: number;
  /** Object types whose origin sits on the wall line (posts and wall pieces). */
  readonly wallTypes: readonly number[];
  /**
   * From the wall line to the inner wall face, tiles: positive when the wall
   * body stands inside its line (Lorencia), negative when it stands outside
   * (Devias, body one tile outward of the post line).
   */
  readonly floorFromWallLine: number;
  /**
   * Wall top and roof underside over the walls' base, tiles. The wall top
   * sits a hair under the measured top face, so the face itself is outside
   * the mask's wall box and never reads as a rim.
   */
  readonly wallHeight: number;
  readonly roofHeight: number;
};

/** One object record, position in tiles. */
export type RoomRecord = { id: number; x: number; y: number; z: number };

/** A room with the height its walls stand at: floor, wall top and roof underside hang off it. */
export type RoomFrame = Room & { readonly base: number };

/** Slabs of one roof sit at one height; a piece on another storey is another roof. */
const SAME_ROOF_HEIGHT = 0.6;
/** Slack past a full slab for two pieces to count as touching. */
const TOUCH_MARGIN = 0.3;
/** How far past the roof's edge a wall origin still belongs to the building. */
const WALL_REACH = 1;

const round2 = (v: number) => Math.round(v * 2) / 2;

export function enumerateRooms(
  records: readonly RoomRecord[],
  spec: RoomSpec
): RoomFrame[] {
  const roofs = records.filter(r => spec.roofTypes.includes(r.id));
  const walls = records.filter(r => spec.wallTypes.includes(r.id));
  const reach = 2 * spec.roofHalf + TOUCH_MARGIN;
  const used = new Set<RoomRecord>();
  const rooms: RoomFrame[] = [];

  for (const seed of roofs) {
    if (used.has(seed)) continue;

    const group = [seed];
    used.add(seed);

    for (let i = 0; i < group.length; i++) {
      const a = group[i];
      for (const b of roofs) {
        if (used.has(b)) continue;
        if (Math.abs(a.x - b.x) > reach || Math.abs(a.y - b.y) > reach) continue;
        if (Math.abs(a.z - b.z) > SAME_ROOF_HEIGHT) continue;
        group.push(b);
        used.add(b);
      }
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of group) {
      minX = Math.min(minX, p.x - spec.roofHalf);
      maxX = Math.max(maxX, p.x + spec.roofHalf);
      minY = Math.min(minY, p.y - spec.roofHalf);
      maxY = Math.max(maxY, p.y + spec.roofHalf);
    }

    // The wall line: the extent of the wall origins under the roof. A roof
    // with no walls under it is a shed, not a room. The lowest wall sets the
    // base: a wall top read off a higher one would let a ray over the low
    // wall's top through.
    let wMinX = Infinity;
    let wMinY = Infinity;
    let wMaxX = -Infinity;
    let wMaxY = -Infinity;
    let base = Infinity;
    for (const w of walls) {
      if (w.x < minX - WALL_REACH || w.x > maxX + WALL_REACH) continue;
      if (w.y < minY - WALL_REACH || w.y > maxY + WALL_REACH) continue;
      wMinX = Math.min(wMinX, w.x);
      wMaxX = Math.max(wMaxX, w.x);
      wMinY = Math.min(wMinY, w.y);
      wMaxY = Math.max(wMaxY, w.y);
      base = Math.min(base, w.z);
    }
    if (wMinX === Infinity) continue;

    const inset = spec.floorFromWallLine;
    const min = { x: round2(wMinX + inset), y: round2(wMinY + inset) };
    const max = { x: round2(wMaxX - inset), y: round2(wMaxY - inset) };

    rooms.push({
      min,
      max,
      centre: { x: (min.x + max.x) / 2, z: (min.y + max.y) / 2 },
      base,
    });
  }

  return rooms.sort((a, b) => a.min.x - b.min.x || a.min.y - b.min.y);
}

/** Whether two footprints are the same room (an enumerated one against a known row). */
export function sameRoom(a: Room, b: Room): boolean {
  return (
    Math.abs(a.centre.x - b.centre.x) < 2 && Math.abs(a.centre.z - b.centre.z) < 2
  );
}
