import { TERRAIN_SIZE } from '../../common/terrain/consts';
import { TERRAIN_INDEX } from '../../common/terrain/utils';
import { writeTerrainOpenness } from '../../common/terrainDynamicLight';

/**
 * A 256x256 per-tile openness mask, for the terrain shader effects that need
 * to know *where* they are allowed to appear — settled snow and rain wetness
 * today, Atlans' caustics later.
 *
 * The plane lives here; the GPU copy rides in the **alpha channel of the
 * terrain dynamic-light texture** (`writeTerrainOpenness`), which the terrain
 * fragment shader already samples at exactly this UV. That is deliberate: the
 * shader's own comments record twice that its sampler list is brittle, so the
 * mask buys its way onto the GPU without adding a sampler, a texture unit or
 * a per-frame upload.
 *
 * Layout matches the light texture: texel `(x, y)` is world tile `(x, z)`,
 * read at `(worldXZ + 0.5) / 256`.
 *
 * ### Why the roofs are measured rather than read
 *
 * The obvious source is the terrain attribute file — the original has a
 * `TW_HEIGHT` flag that raises building floors to `g_fSpecialHeight`
 * (ZzzLodTerrain.cpp:1723) and lifts the camera for them
 * (CameraUtility.cpp:169), which reads exactly like "this tile is indoors".
 * It is not usable: decoding the shipped `.att` files shows Lorencia uses only
 * `SafeZone`, `Character` and `NoMove`, with **zero** `Height` tiles in all
 * 65 536, and Devias adds only `NoGround`. Nothing in the data marks an
 * interior floor, so it has to come from the geometry.
 *
 * Two sources, painted together:
 *
 *  - **Roof slabs.** The same test `CeilingHideSystem` uses to find the
 *    ceiling over the hero — a mesh whose world AABB is a thin slab sitting
 *    above head height — applied to the whole map instead of a radius around
 *    the player. This is what covers the buildings nobody has enumerated.
 *  - **Known interiors.** The room boxes the dust recipes already use. These
 *    are painted unconditionally at map load because the roof scan has one
 *    blind spot it cannot fix: the Lorencia pub's roof is *lifted 100 units
 *    out of view* while the hero is inside it (`loadMapIntoScene`), so a
 *    player who logs in standing in the tavern would have no slab to find.
 *
 * Painting is **additive** — a tile that has ever been seen as roofed stays
 * roofed for the life of the map. That is what makes the pub's disappearing
 * roof harmless: it is measured once on the way in and never un-measured.
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

/**
 * Mark an axis-aligned world footprint as roofed. Coordinates are in tiles and
 * need not be integers — the box is expanded to whole tiles, because a roof
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

/** Share of the map currently marked roofed — a one-line sanity check. */
export function roofedTileCount(): number {
  const b = ensureBytes();
  let n = 0;
  for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
    if (b[i] === 0) n++;
  }
  return n;
}
