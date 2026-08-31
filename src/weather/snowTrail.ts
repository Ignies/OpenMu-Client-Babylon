import type { WeatherLayer } from './layer';
import { RawTexture, Texture, type Scene } from '../libs/babylon/exports';
import type { ThinEngine } from '@babylonjs/core/Engines/thinEngine';

/**
 * The trail ploughed through settled snow: one continuous channel behind the
 * hero, with the snow heaped along its rims and churned on its floor.
 *
 * This used to be decals — a chain of `drag` quads from `footprints.ts`, one
 * per stride. It cannot be. Each quad is its own little height field with its
 * own ends, so where one piece's floor rises back to the surface there is a
 * wall across the channel, and however far the pieces overlap the eye reads
 * a ladder of rungs. A trail is ONE surface, so it is kept as one surface: a
 * world-space depth map, painted on every footfall, that the terrain shader
 * folds into the snow's own relief. The walls, the lit and shaded faces, the
 * heaped rims and the churned floor then all come out of the same gradient
 * the drifts already use — the trench is a shape in the snow, not a picture
 * laid on it.
 *
 * The map is 2048² (4 MB). It is allocated the first time a boot ploughs it,
 * and every pass over it is bounded by a dirty rectangle: the plough marks
 * the texels it wrote, the decay only walks the rectangle that has ever been
 * painted, and the upload is a `texSubImage2D` of the union rather than the
 * whole 4 MB each footfall.
 *
 * Owned here, read by `libs/mu/terrainOverlay.ts` (the `ovTrail` sampler).
 * Stamped by `ecs/systems/footprintSystem.ts` from the hero's stride.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Texels per tile. Eight resolves a 0.1-tile rim; the map is 256 tiles. */
export const TRAIL_RES = 8;

/** Side of the depth map in texels. */
export const TRAIL_SIZE = 256 * TRAIL_RES;

/**
 * Seconds for a full-depth channel to fill back in to nothing. Long: a walked
 * path should still be there when the hero turns round, and the snowfall is
 * what closes it, not the clock. Bounded only so a long session does not end
 * with the whole field trodden flat.
 */
const FILL_SECONDS = 240;

/** Seconds between decay passes; each walks the painted rectangle. */
const DECAY_EVERY = 2;

/** Stable 0..1 hash of an integer pair (Hoskins' hash21, as the shader's). */
function hash2(x: number, y: number): number {
  let px = (x * 0.1031) % 1;
  let py = (y * 0.1031) % 1;
  let pz = (x * 0.0973) % 1;
  if (px < 0) px += 1;
  if (py < 0) py += 1;
  if (pz < 0) pz += 1;
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px += d;
  py += d;
  pz += d;
  const r = ((px + py) * pz) % 1;
  return r < 0 ? r + 1 : r;
}

// ---- 2. state + readers -------------------------------------------------

/** A texel rectangle, inclusive; `x0 > x1` means empty. */
type Rect = { x0: number; z0: number; x1: number; z1: number };

const emptyRect = (r: Rect): Rect => {
  r.x0 = TRAIL_SIZE;
  r.z0 = TRAIL_SIZE;
  r.x1 = -1;
  r.z1 = -1;
  return r;
};
const rectEmpty = (r: Rect): boolean => r.x1 < r.x0 || r.z1 < r.z0;
const growRect = (r: Rect, x0: number, z0: number, x1: number, z1: number) => {
  if (x0 < r.x0) r.x0 = x0;
  if (z0 < r.z0) r.z0 = z0;
  if (x1 > r.x1) r.x1 = x1;
  if (z1 > r.z1) r.z1 = z1;
};

/** The depth map; allocated on the first plough. */
let data: Uint8Array | null = null;

/** Scratch for the sub-rect upload, grown to the largest rect seen. */
let upload: Uint8Array = new Uint8Array(0);

let texture: RawTexture | null = null;
let sinceDecay = 0;

/** Texels written since the last upload. */
const dirty: Rect = emptyRect({ x0: 0, z0: 0, x1: 0, z1: 0 });
/** Every texel that may be non-zero; what the decay walks. */
const painted: Rect = emptyRect({ x0: 0, z0: 0, x1: 0, z1: 0 });

function ensureData(): Uint8Array {
  if (!data) data = new Uint8Array(TRAIL_SIZE * TRAIL_SIZE);
  return data;
}

/** The depth map as a texture, created on first use for this scene. */
export function snowTrailTexture(scene: Scene): RawTexture {
  if (texture && texture.getScene() === scene) return texture;

  // `data` may still be null: a texture built from no data is all zero,
  // which is exactly the untrodden map. The first plough uploads its rect.
  texture = RawTexture.CreateRTexture(
    data,
    TRAIL_SIZE,
    TRAIL_SIZE,
    scene,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE
  );
  texture.name = 'snowTrail';
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.onDisposeObservable.addOnce(() => {
    texture = null;
  });

  // A fresh texture holds nothing: whatever is painted must go up whole.
  if (!rectEmpty(painted)) {
    growRect(dirty, painted.x0, painted.z0, painted.x1, painted.z1);
  }

  return texture;
}

/**
 * Plough a channel from (x0, z0) to (x1, z1), in tiles. `width` is the full
 * width of the channel at the surface; `depth` is 0…1 at the centre.
 *
 * A capsule stamp: full depth over the middle half of the width, ramping to
 * nothing over the outer quarter on each side, so the rim the shader raises
 * (see the `ovTrail` block) sits on a slope and not on a cliff. Written with
 * `max`, so re-treading a channel deepens it and never stacks.
 */
export function ploughSnowTrail(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  width: number,
  depth: number
): void {
  if (depth <= 0 || width <= 0) return;

  const map = ensureData();

  const half = width * 0.5 * TRAIL_RES;
  const ax = (x0 + 0.5) * TRAIL_RES;
  const az = (z0 + 0.5) * TRAIL_RES;
  const bx = (x1 + 0.5) * TRAIL_RES;
  const bz = (z1 + 0.5) * TRAIL_RES;

  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;

  const minX = Math.max(0, Math.floor(Math.min(ax, bx) - half));
  const maxX = Math.min(TRAIL_SIZE - 1, Math.ceil(Math.max(ax, bx) + half));
  const minZ = Math.max(0, Math.floor(Math.min(az, bz) - half));
  const maxZ = Math.min(TRAIL_SIZE - 1, Math.ceil(Math.max(az, bz) + half));
  if (maxX < minX || maxZ < minZ) return;

  let wrote = false;

  for (let ty = minZ; ty <= maxZ; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      const px = tx + 0.5;
      const pz = ty + 0.5;

      let t = len2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;

      const cx = ax + dx * t - px;
      const cz = az + dz * t - pz;
      // The edge wanders: a hash of where this texel sits on the map, so
      // the wall is broken and shouldered (improved_2.jpg) rather than one
      // clean capsule outline. Position-stable, so re-treading the same
      // ground finds the same edge instead of widening it.
      const jit = hash2(Math.floor(px * 0.5), Math.floor(pz * 0.5));
      const edge = 0.86 + jit * 0.28;
      const d = Math.sqrt(cx * cx + cz * cz) / (half * edge);

      if (d >= 1) continue;

      // Full depth over most of the width, then a short ramp to 0 at the
      // edge. The shader turns the ramp into the wall (ovTrailShape), so
      // the shorter it is the more vertical the wall.
      const s = d <= 0.68 ? 1 : 1 - (d - 0.68) / 0.32;
      const e = s * s * (3 - 2 * s);
      const v = Math.round(e * depth * 255);

      const i = ty * TRAIL_SIZE + tx;
      if (v > map[i]) {
        map[i] = v;
        wrote = true;
      }
    }
  }

  if (!wrote) return;
  growRect(dirty, minX, minZ, maxX, maxZ);
  growRect(painted, minX, minZ, maxX, maxZ);
}

/** Whether there is any trail to draw at all. */
export function snowTrailPainted(): boolean {
  return !rectEmpty(painted);
}

/**
 * Fill the channels back in by `amount` (of 255) over the painted rectangle,
 * then shrink the rectangle to what is still non-zero.
 */
function decay(amount: number): void {
  if (!data || rectEmpty(painted)) return;

  const { x0, z0, x1, z1 } = painted;
  growRect(dirty, x0, z0, x1, z1);

  let nx0 = TRAIL_SIZE;
  let nz0 = TRAIL_SIZE;
  let nx1 = -1;
  let nz1 = -1;

  for (let ty = z0; ty <= z1; ty++) {
    const row = ty * TRAIL_SIZE;
    for (let tx = x0; tx <= x1; tx++) {
      const i = row + tx;
      const v = data[i];
      if (v === 0) continue;
      const n = v > amount ? v - amount : 0;
      data[i] = n;
      if (n === 0) continue;
      if (tx < nx0) nx0 = tx;
      if (tx > nx1) nx1 = tx;
      if (ty < nz0) nz0 = ty;
      if (ty > nz1) nz1 = ty;
    }
  }

  painted.x0 = nx0;
  painted.z0 = nz0;
  painted.x1 = nx1;
  painted.z1 = nz1;
}

/** `texSubImage2D` of the dirty rectangle only. */
function flush(): void {
  if (rectEmpty(dirty) || !texture || !data) return;

  const internal = texture.getInternalTexture();
  const engine = texture.getScene()?.getEngine() as ThinEngine | undefined;
  if (!internal || !engine || !internal.isReady) return;

  const { x0, z0, x1, z1 } = dirty;
  const w = x1 - x0 + 1;
  const h = z1 - z0 + 1;

  if (upload.length < w * h) upload = new Uint8Array(w * h);
  for (let ty = 0; ty < h; ty++) {
    const src = (z0 + ty) * TRAIL_SIZE + x0;
    upload.set(data.subarray(src, src + w), ty * w);
  }

  engine.updateTextureData(
    internal,
    upload.subarray(0, w * h),
    x0,
    z0,
    w,
    h
  );

  emptyRect(dirty);
}

function update(dt: number): void {
  if (!rectEmpty(painted)) {
    sinceDecay += dt;
    if (sinceDecay >= DECAY_EVERY) {
      decay(Math.max(1, Math.round((255 * sinceDecay) / FILL_SECONDS)));
      sinceDecay = 0;
    }
  }

  flush();
}

/** Wipe the trail: a map change or a teardown. */
export function resetSnowTrail(): void {
  if (data && !rectEmpty(painted)) {
    // Only the painted rectangle can hold anything, so only it is zeroed
    // and only it goes back up.
    for (let ty = painted.z0; ty <= painted.z1; ty++) {
      const row = ty * TRAIL_SIZE;
      data.fill(0, row + painted.x0, row + painted.x1 + 1);
    }
    growRect(dirty, painted.x0, painted.z0, painted.x1, painted.z1);
  }
  emptyRect(painted);
  sinceDecay = 0;
  flush();
}

// ---- 3. the layer -------------------------------------------------------

export const snowTrailLayer: WeatherLayer = {
  name: 'snowTrail',
  update: (_map, dt) => update(dt),
  reset: resetSnowTrail,
};
