import type { AbstractMesh } from '../../controllers/render/babylon/exports';
import { ENUM_WORLD } from '../../core/types';
import { lighting } from '../../controllers/lighting';
import type { World } from '../world';

/**
 * Is the hero under a roof, and which meshes is it made of. Weather and the indoor ambience read
 * the answer on every Fidelity preset; `ceilingHideSystem.ts` fades those meshes (the `roofFade`
 * improvement). See ecs/readme.md.
 */

const ENABLED_WORLDS = new Set<ENUM_WORLD>([
  ENUM_WORLD.WD_0LORENCIA,
  ENUM_WORLD.WD_2DEVIAS,
]);

/** Slab bottom must be this far (tiles) above the hero's feet: clears his head. */
const ABOVE_HEAD = 1.0;

/**
 * Whether a submesh standing on the ground at `ground` could be a ceiling
 * piece this detection finds: the slab test below, without the hero. The prop
 * batches keep any type that answers yes on the per-object path, because a
 * batched mesh has no visibility of its own to fade.
 */
export function mayBeCeilingPiece(
  map: ENUM_WORLD,
  minY: number,
  maxY: number,
  ground: number
): boolean {
  if (!ENABLED_WORLDS.has(map)) return false;

  return minY >= ground + ABOVE_HEAD && maxY - minY <= MAX_THICKNESS;
}
/**
 * How far (tiles) under the room's roof underside a slab may still start and
 * count as roof.
 *
 * Inside a room the frame says where the ceiling is, and only that height is
 * ceiling. "Above the hero's head" is not: the Lorencia pub stands its
 * candelabra, bottles and cups on tables between 2.7 and 3.6, its roof
 * underside at 4.28, and the head-height rule faded all of them out of the
 * room the moment it became the active area. Same slack as `SAME_ROOF_HEIGHT`,
 * for pieces of one roof whose bases were measured off different walls.
 */
const ROOF_SLACK = 0.6;
/** Footprint slack (tiles) for the hero-under test. */
const FOOTPRINT_MARGIN = 0.25;
/** Gap (tiles) across which two pieces still count as one roof. */
const TOUCH_MARGIN = 0.05;
/** Height difference (tiles) allowed between two pieces of the same roof. */
const SAME_ROOF_HEIGHT = 0.6;
/** Taller boxes are tree crowns / poles, not ceilings. */
const MAX_THICKNESS = 2.5;
/** Objects further than this (tiles, per axis) are not part of the building. */
const OBJECT_REACH = 12;
/**
 * Flood-fill radius (tiles) around the hero. Devias shop rows abut exactly,
 * so touching alone would chain a whole street of roofs; a building is at
 * most ~8 tiles across.
 */
const ROOF_RADIUS = 8;
/**
 * The roof set only changes when the hero moves to a different tile, so the
 * slab collection + flood fill (which walks every visible object's child
 * meshes) is gated on that rather than run every frame. Sub-tile movement
 * cannot change which building he is inside; it can only shift the
 * footprint test by at most half a tile at a roof's edge, which the 0.2 s
 * fade already smears over.
 */
const RESCAN_TILE = 1;
/**
 * Fallback re-scan. A model finishing its async load, or a roof piece being
 * disposed at the visibility boundary, changes the answer without the hero
 * moving. Four scans a second covers that and is still ~15x cheaper than
 * the per-frame scan this replaces.
 */
const RESCAN_INTERVAL = 0.25;

/** The active room's frame with its heights (`LookArea.volume`). */
type RoomVolume = NonNullable<NonNullable<ReturnType<typeof lighting.look>>['area']>['volume'] & object;

const NO_ROOF: readonly AbstractMesh[] = [];

let heroUnderRoof = false;

/** True while the hero stands under a ceiling (weather must not fall in), on every preset. */
export function isHeroUnderRoof(): boolean {
  return heroUnderRoof;
}

interface Slab {
  mesh: AbstractMesh;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
}

/**
 * The roof finder for one world: call it every frame with the frame time; it answers the meshes
 * of the roof the hero is under (empty when none) and keeps `isHeroUnderRoof` current.
 */
export function createRoofDetector(world: World): (dt: number) => readonly AbstractMesh[] {
  const query = world.with('modelObject', 'transform', 'visibility', 'worldIndex');

  const slabs: Slab[] = [];

  /** The roof the hero is under, carried between scans; only the scan is gated. */
  let roofMeshes: AbstractMesh[] = [];
  let lastTileX = NaN;
  let lastTileZ = NaN;
  let lastMapIndex: ENUM_WORLD | null = null;
  let lastRoom = '';
  let sinceRescan = RESCAN_INTERVAL;

  const roomKey = (room: RoomVolume | null) =>
    room ? `${room.minX},${room.minY},${room.maxX},${room.maxY}` : '';

  /** Whether the slab's centre lies inside the room's frame. */
  function inRoom(s: Slab, room: RoomVolume): boolean {
    const cx = (s.minX + s.maxX) * 0.5;
    const cz = (s.minZ + s.maxZ) * 0.5;

    return cx >= room.minX && cx <= room.maxX && cz >= room.minY && cz <= room.maxY;
  }

  function collectSlabs(heroY: number, hx: number, hz: number, room: RoomVolume | null) {
    slabs.length = 0;

    // A room knows where its ceiling is; outside one, head height is the only
    // measure there is.
    const slabFloor = room ? room.roofY - ROOF_SLACK : heroY + ABOVE_HEAD;

    for (const e of query) {
      if (e.worldIndex !== world.mapIndex) continue;
      if (e.visibility.state !== 'visible') continue;
      // Only scenery is ever a ceiling. A monster's head, a player's helm or a
      // pet holding station over its owner is a small box above head height
      // too, and faded out the moment it stood over the hero.
      if (!e.modelObject.IsMapObject) continue;

      const { pos } = e.transform;
      if (room) {
        if (pos.x < room.minX - OBJECT_REACH || pos.x > room.maxX + OBJECT_REACH) continue;
        if (pos.z < room.minY - OBJECT_REACH || pos.z > room.maxY + OBJECT_REACH) continue;
      } else {
        if (Math.abs(pos.x - hx) > OBJECT_REACH) continue;
        if (Math.abs(pos.z - hz) > OBJECT_REACH) continue;
      }

      const mo = e.modelObject;
      if (!mo.Ready || !mo.gltf) continue;

      for (const mesh of mo.gltf.mesh.getChildMeshes(false)) {
        if (mesh.metadata?.SkipBoundingBox) continue;
        if (mesh.getTotalVertices() === 0) continue;

        const box = mesh.getBoundingInfo().boundingBox;
        const min = box.minimumWorld;
        const max = box.maximumWorld;

        if (min.y < slabFloor) continue;
        if (max.y - min.y > MAX_THICKNESS) continue;

        const cx = (min.x + max.x) * 0.5 - hx;
        const cz = (min.z + max.z) * 0.5 - hz;
        if (!room && cx * cx + cz * cz > ROOF_RADIUS * ROOF_RADIUS) continue;

        slabs.push({
          mesh,
          minX: min.x,
          maxX: max.x,
          minZ: min.z,
          maxZ: max.z,
          minY: min.y,
        });
      }
    }
  }

  function touches(a: Slab, b: Slab): boolean {
    if (Math.abs(a.minY - b.minY) > SAME_ROOF_HEIGHT) return false;
    return (
      a.minX <= b.maxX + TOUCH_MARGIN &&
      b.minX <= a.maxX + TOUCH_MARGIN &&
      a.minZ <= b.maxZ + TOUCH_MARGIN &&
      b.minZ <= a.maxZ + TOUCH_MARGIN
    );
  }

  return dt => {
    const hero = world.playerEntity;
    const enabled = ENABLED_WORLDS.has(world.mapIndex) && !!hero;

    sinceRescan += dt;

    if (!enabled) {
      if (roofMeshes.length > 0) roofMeshes = [];
      lastTileX = NaN;
      lastTileZ = NaN;
      lastMapIndex = null;
      lastRoom = '';
      heroUnderRoof = false;
      return NO_ROOF;
    }

    const ht = hero.transform;
    const hx = ht.pos.x + (ht.posOffset?.x ?? 0);
    const hy = ht.pos.y;
    const hz = ht.pos.z + (ht.posOffset?.z ?? 0);

    const tileX = Math.floor(hx / RESCAN_TILE);
    const tileZ = Math.floor(hz / RESCAN_TILE);
    // The frame, not the footprint: a room whose volume the map never
    // measured cannot say where its roof is, so it falls back to the
    // hero-seeded fill rather than fading everything standing in it.
    const area = lighting.look()?.area ?? null;
    const room = area?.volume ?? null;
    const roomNow = roomKey(room);

    // Gate: re-derive the roof only when the hero changes tile, the map
    // or the room changes, or the fallback interval expires.
    if (
      tileX !== lastTileX ||
      tileZ !== lastTileZ ||
      world.mapIndex !== lastMapIndex ||
      roomNow !== lastRoom ||
      sinceRescan >= RESCAN_INTERVAL
    ) {
      lastTileX = tileX;
      lastTileZ = tileZ;
      lastMapIndex = world.mapIndex;
      lastRoom = roomNow;
      sinceRescan = 0;

      collectSlabs(hy, hx, hz, room);

      const roof: Slab[] = [];
      const inRoof = new Set<Slab>();

      if (room) {
        // The room's whole roof: every slab over its frame.
        for (const s of slabs) {
          if (inRoom(s, room)) {
            roof.push(s);
            inRoof.add(s);
          }
        }
      } else {
        // Seeds: slabs directly over the hero.
        for (const s of slabs) {
          if (
            hx >= s.minX - FOOTPRINT_MARGIN &&
            hx <= s.maxX + FOOTPRINT_MARGIN &&
            hz >= s.minZ - FOOTPRINT_MARGIN &&
            hz <= s.maxZ + FOOTPRINT_MARGIN
          ) {
            roof.push(s);
            inRoof.add(s);
          }
        }

        // Flood fill through touching pieces: the rest of this building's roof.
        for (let i = 0; i < roof.length; i++) {
          const a = roof[i];
          for (const b of slabs) {
            if (inRoof.has(b)) continue;
            if (!touches(a, b)) continue;
            roof.push(b);
            inRoof.add(b);
          }
        }
      }

      roofMeshes = roof.map(s => s.mesh);
      heroUnderRoof = roofMeshes.length > 0 || area !== null;
    }

    // A piece disposed at the visibility boundary leaves the set, and the
    // next frame re-scans so the rest of that building is re-evaluated.
    for (let i = roofMeshes.length - 1; i >= 0; i--) {
      if (!roofMeshes[i].isDisposed()) continue;
      roofMeshes.splice(i, 1);
      sinceRescan = RESCAN_INTERVAL;
    }

    return roofMeshes;
  };
}
