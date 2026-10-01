import { TERRAIN_SIZE } from './consts';
import { TERRAIN_INDEX } from './utils';
import { writeTerrainOpenness } from './terrainDynamicLight';

/**
 * Per-tile openness mask (255 open, 0 roofed), uploaded in the alpha of the dynamic-light texture.
 * Roofs come from geometry, since no `.att` flag marks interiors (`TW_HEIGHT`, ZzzLodTerrain.cpp:1723).
 */

/** Byte value for a tile with open sky above it. */
const OPEN = 255;

export type MaskBox = {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
};

/** One byte per tile, 255 open / 0 roofed. Uploaded as the light texture's alpha. */
let openness: Uint8Array | null = null;

function ensureBytes(): Uint8Array {
  if (!openness) {
    openness = new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE);
    openness.fill(OPEN);
  }
  return openness;
}

/** Everything open to the sky again. Called when a map starts loading. */
export function resetTerrainMask(): void {
  ensureBytes().fill(OPEN);
}

/** Slab bottom this far (tiles) above the ground under it. Clears a head. */
const ROOF_ABOVE_GROUND = 1.6;

/** Thicker boxes are tree crowns, towers and cliffs, not ceilings. */
const ROOF_MAX_THICKNESS = 2.5;

/** A roof more than this far up is a spire, and shelters nothing below it. */
const ROOF_MAX_HEIGHT = 6;

/**
 * Whether a mesh's world box (`minY..maxY`) over ground at `ground` is a
 * roof: a thin slab sitting above head height. The one test both the object
 * scan (`TerrainMaskSystem`) and the prop batches run.
 */
export function isRoofSlab(minY: number, maxY: number, ground: number): boolean {
  if (maxY - minY > ROOF_MAX_THICKNESS) return false;

  const clearance = minY - ground;

  return clearance >= ROOF_ABOVE_GROUND && clearance <= ROOF_MAX_HEIGHT;
}

/** Bumped whenever a paint changes a tile; readers that cache openness poll it. */
let maskVersion = 0;

export function terrainMaskVersion(): number {
  return maskVersion;
}

/**
 * Mark an axis-aligned world footprint as roofed. Coordinates are in tiles and
 * need not be integers - the box is expanded to whole tiles, because a roof
 * covering any part of a tile keeps the weather off all of it.
 *
 * Additive: this only ever closes tiles, never re-opens them.
 */
export function paintRoof(box: MaskBox): boolean {
  const b = ensureBytes();

  const x0 = Math.max(0, Math.floor(box.minX));
  const x1 = Math.min(TERRAIN_SIZE - 1, Math.ceil(box.maxX));
  const z0 = Math.max(0, Math.floor(box.minZ));
  const z1 = Math.min(TERRAIN_SIZE - 1, Math.ceil(box.maxZ));

  let changed = false;

  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const o = TERRAIN_INDEX(x, z);
      if (b[o] !== 0) {
        b[o] = 0;
        changed = true;
      }
    }
  }

  if (changed) maskVersion++;

  return changed;
}

/**
 * Copy the plane into the light texture's alpha.
 *
 * Unconditional rather than dirty-tracked: the light texture reallocates its
 * bytes on every map load (`initTerrainDynamicLight`), so a mask that skipped
 * the write because nothing had changed would leave the new buffer holding
 * someone else's roofs. 64 KB twice a second is not worth the bookkeeping.
 */
export function flushTerrainMask(): void {
  writeTerrainOpenness(ensureBytes());
}

/** Whether a tile is open to the sky. For tests and debug overlays. */
export function isTileOpen(x: number, z: number): boolean {
  const b = ensureBytes();
  const xi = Math.floor(x);
  const zi = Math.floor(z);

  if (xi < 0 || zi < 0 || xi >= TERRAIN_SIZE || zi >= TERRAIN_SIZE) return true;

  return b[TERRAIN_INDEX(xi, zi)] !== 0;
}
