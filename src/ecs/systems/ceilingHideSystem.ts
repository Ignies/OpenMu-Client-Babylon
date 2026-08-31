import type { AbstractMesh } from '../../libs/babylon/exports';
import { ENUM_WORLD } from '../../common/types';
import type { ISystemFactory } from '../world';

/**
 * Fades out the ceiling of the building the hero is standing in, so the
 * inside stays readable from the fixed camera. The original never hides
 * roofs (its only object fade is the Chaos Castle one, ZzzObject.cpp:228);
 * this is the Devias counterpart of the Lorencia pub hack in
 * loadMapIntoScene, which lifts HOUSE_WALL05/06 out of view.
 *
 * Data-driven rather than a per-type table: Devias buildings are tiled from
 * wall/roof pieces (Object3 types 15-18, 33-34, 62-63, …) whose roof
 * sub-meshes sit 2.4-3.6 tiles up, while wall meshes start at the floor. A
 * mesh is "a ceiling piece" when its world AABB is a thin slab above head
 * height. The piece over the hero seeds a flood fill through touching pieces
 * at about the same height, so the whole roof of that building fades, not
 * just the tile above him.
 */

const ENABLED_WORLDS = new Set<ENUM_WORLD>([ENUM_WORLD.WD_2DEVIAS]);

/** Slab bottom must be this far (tiles) above the hero's feet: clears his head. */
const ABOVE_HEAD = 1.0;
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
/** Fade speed, visibility per second. */
const FADE_SPEED = 5;
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

let heroUnderRoof = false;

/** True while the hero stands under a ceiling this system is hiding (weather must not fall in). */
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

export const CeilingHideSystem: ISystemFactory = world => {
  const query = world.with('modelObject', 'transform', 'visibility', 'worldIndex');

  /** Meshes currently faded (or fading back in). */
  const fading = new Map<AbstractMesh, { hide: boolean }>();

  const slabs: Slab[] = [];

  /**
   * The roof the hero is under, carried between scans. The fade loop reads
   * this every frame; only the scan that produces it is gated.
   */
  let roofMeshes: AbstractMesh[] = [];
  let lastTileX = NaN;
  let lastTileZ = NaN;
  let lastMapIndex: ENUM_WORLD | null = null;
  let sinceRescan = RESCAN_INTERVAL;

  function collectSlabs(heroY: number, hx: number, hz: number) {
    slabs.length = 0;

    for (const e of query) {
      if (e.worldIndex !== world.mapIndex) continue;
      if (e.visibility.state !== 'visible') continue;

      const { pos } = e.transform;
      if (Math.abs(pos.x - hx) > OBJECT_REACH) continue;
      if (Math.abs(pos.z - hz) > OBJECT_REACH) continue;

      const mo = e.modelObject;
      if (!mo.Ready || !mo.gltf) continue;

      for (const mesh of mo.gltf.mesh.getChildMeshes(false)) {
        if (mesh.metadata?.SkipBoundingBox) continue;
        if (mesh.getTotalVertices() === 0) continue;

        const box = mesh.getBoundingInfo().boundingBox;
        const min = box.minimumWorld;
        const max = box.maximumWorld;

        if (min.y < heroY + ABOVE_HEAD) continue;
        if (max.y - min.y > MAX_THICKNESS) continue;

        const cx = (min.x + max.x) * 0.5 - hx;
        const cz = (min.z + max.z) * 0.5 - hz;
        if (cx * cx + cz * cz > ROOF_RADIUS * ROOF_RADIUS) continue;

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

  function markHide(mesh: AbstractMesh) {
    const entry = fading.get(mesh);
    if (entry) entry.hide = true;
    else fading.set(mesh, { hide: true });
  }

  return {
    update: dt => {
      const hero = world.playerEntity;
      const enabled = ENABLED_WORLDS.has(world.mapIndex) && !!hero;

      sinceRescan += dt;

      if (enabled) {
        const ht = hero.transform;
        const hx = ht.pos.x + (ht.posOffset?.x ?? 0);
        const hy = ht.pos.y;
        const hz = ht.pos.z + (ht.posOffset?.z ?? 0);

        const tileX = Math.floor(hx / RESCAN_TILE);
        const tileZ = Math.floor(hz / RESCAN_TILE);

        // Gate: re-derive the roof only when the hero changes tile, the map
        // changes, or the fallback interval expires. Everything else in this
        // system is the per-frame fade, which is O(faded meshes).
        if (
          tileX !== lastTileX ||
          tileZ !== lastTileZ ||
          world.mapIndex !== lastMapIndex ||
          sinceRescan >= RESCAN_INTERVAL
        ) {
          lastTileX = tileX;
          lastTileZ = tileZ;
          lastMapIndex = world.mapIndex;
          sinceRescan = 0;

          collectSlabs(hy, hx, hz);

          // Seeds: slabs directly over the hero.
          const roof: Slab[] = [];
          const inRoof = new Set<Slab>();
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

          roofMeshes = roof.map(s => s.mesh);
          heroUnderRoof = roofMeshes.length > 0;
        }

        // Re-assert the hide flag every frame from the carried set: the fade
        // loop below clears it, and a mesh that dropped out of the set on the
        // last scan is simply no longer re-marked, so it fades back in.
        for (let i = roofMeshes.length - 1; i >= 0; i--) {
          const mesh = roofMeshes[i];
          if (mesh.isDisposed()) {
            // Disposed at the visibility boundary; drop it and re-scan next
            // frame so the rest of that building is re-evaluated.
            roofMeshes.splice(i, 1);
            sinceRescan = RESCAN_INTERVAL;
            continue;
          }
          markHide(mesh);
        }
      } else {
        if (roofMeshes.length > 0) roofMeshes = [];
        lastTileX = NaN;
        lastTileZ = NaN;
        lastMapIndex = null;
        heroUnderRoof = false;
      }

      if (fading.size === 0) return;

      const step = FADE_SPEED * dt;

      for (const [mesh, entry] of fading) {
        if (mesh.isDisposed()) {
          fading.delete(mesh);
          continue;
        }

        if (entry.hide) {
          mesh.visibility = Math.max(0, mesh.visibility - step);
          // Re-evaluated next frame; anything no longer part of the roof fades back.
          entry.hide = false;
        } else {
          mesh.visibility = Math.min(1, mesh.visibility + step);
          if (mesh.visibility >= 1) fading.delete(mesh);
        }
      }
    },
  };
};
