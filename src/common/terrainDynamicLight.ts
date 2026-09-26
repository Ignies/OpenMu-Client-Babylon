import {
  RawTexture,
  Texture,
  type IVector3Like,
  type Scene,
} from '../libs/babylon/exports';
import { TERRAIN_SIZE } from './terrain/consts';
import { TERRAIN_INDEX, TERRAIN_INDEX_REPEAT } from './terrain/utils';
import { dynamicLightGain } from './lightingQuality';

export type TerrainLightColor = { r: number; g: number; b: number };

export type TerrainLightEmitter = {
  /**
   * World position, held by reference and read every frame: the footprint is
   * measured from the float x / z like the original's `AddTerrainLight`, so a
   * carried light slides with the body instead of stepping per tile.
   */
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly range: number;
  readonly falloff?: number;
  readonly floorGain?: number;
  color(elapsedMs: number): TerrainLightColor;
};

const CHANNELS = 3;

let baked: Float32Array | null = null;

let primary: Float32Array | null = null;

let floor: Float32Array | null = null;

/**
 * The dynamic light standing on each tile at full strength - the same sum as
 * the delta in `primary`, but without the share the point-light pool has
 * taken over. `requestBodyTerrainLight` is its only reader; see it for why a
 * body needs the part of the light the ground gets per pixel.
 */
let bodyLift: Float32Array | null = null;

const DELTA_ENCODE = 127.5;

/**
 * Where the encode stops being linear, as a fraction of the byte range.
 *
 * Below this the floor light is written through untouched. Above it the sum
 * bends toward the ceiling along an exponential and never reaches it, so two
 * candelabra whose pools overlap read as brighter than one and not as a flat
 * plateau. A hard clamp is what forced the emitters to be tuned as tight hot
 * cores in the first place - see the note in devias/candleObject.ts - because
 * any generous tail summed straight into the ceiling and erased the gradient
 * the pools were supposed to read against.
 */
const DELTA_KNEE = 0.55;
const DELTA_LINEAR = 255 * DELTA_KNEE;
const DELTA_ROOM = 255 - DELTA_LINEAR;
let deltaBytes: Uint8Array | null = null;
let deltaDirty = false;

const emitters = new Set<TerrainLightEmitter>();

/** Tile each emitter last wrote from; a change rebuilds the touched set. */
const emitterTiles = new Map<TerrainLightEmitter, number>();

let touched: Int32Array | null = null;
let touchedDirty = true;

/** `touched` as a flag per tile, for readers that test a sample point. */
const touchedMask = new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE);

/** Bumped whenever the tiles the layer may have written change, idling included. */
let touchedVersion = 0;

/** Tiles past the footprint radius kept in the touched set. */
const TOUCHED_MARGIN = 1;

const tileKey = (x: number, y: number): number =>
  Math.floor(x) * TERRAIN_SIZE * 4 + Math.floor(y);

export function initTerrainDynamicLight(liftedBaked: Float32Array): void {
  baked = liftedBaked;
  primary = liftedBaked.slice();
  floor = new Float32Array(liftedBaked.length);
  bodyLift = new Float32Array(liftedBaked.length);
  deltaBytes = new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE * 4);
  // Alpha is not light (see writeTerrainOpenness). Open sky until something
  // says otherwise, so a map whose mask has not been built yet reads as
  // outdoors rather than as one enormous roof.
  for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
    deltaBytes[i * 4 + 3] = 255;
  }
  deltaDirty = true;
  emitters.clear();
  emitterTiles.clear();
  touched = null;
  touchedDirty = true;
  touchedMask.fill(0);
  touchedVersion++;
}

export function disposeTerrainDynamicLight(): void {
  baked = null;
  primary = null;
  floor = null;
  bodyLift = null;
  deltaBytes = null;
  emitters.clear();
  emitterTiles.clear();
  touched = null;
  touchedDirty = true;
  touchedMask.fill(0);
  touchedVersion++;
}

let deltaTexture: RawTexture | null = null;

export function getTerrainLightTexture(scene: Scene): RawTexture {
  if (!deltaTexture || deltaTexture.getScene() !== scene) {
    deltaTexture = RawTexture.CreateRGBATexture(
      new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE * 4),
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      scene,
      false,
      false,
      Texture.BILINEAR_SAMPLINGMODE
    );

    deltaTexture.name = 'terrainDynamicLight';
    deltaTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
    deltaTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  return deltaTexture;
}

/**
 * The alpha channel of the shared terrain texture: 255 = open sky over this
 * tile, 0 = roofed. Written by `terrainMask.ts`, read by the ground overlays
 * in `terrainOverlay.ts`.
 *
 * It lives here rather than in a texture of its own for one blunt reason: the
 * terrain fragment shader already samples this texture, at this exact UV, for
 * the torch light. The mask needs the same lookup, and the shader's own
 * comments twice record how brittle its sampler list is - a sampler declared
 * but unbound, or two sampler types landing on one unit, is a GL draw error
 * that makes the whole terrain vanish. Riding in a channel nobody was using
 * costs no unit, no upload and no ordering rule.
 */
export function writeTerrainOpenness(openness: Uint8Array): void {
  if (!deltaBytes) return;

  for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
    deltaBytes[i * 4 + 3] = openness[i];
  }

  deltaDirty = true;
}

export function uploadTerrainLightDelta(): void {
  if (!deltaDirty || !deltaBytes || !deltaTexture) return;

  deltaDirty = false;
  deltaTexture.update(deltaBytes);
}

/**
 * Whether any registered emitter's footprint reaches into the tile box
 * `[minX, maxX] x [minZ, maxZ]`. The prop batches re-pack a chunk's light
 * only while a torch can change it.
 */
export function terrainLightReaches(
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number
): boolean {
  for (const emitter of emitters) {
    const { x, z } = emitter.position;
    const reach = emitter.range + TOUCHED_MARGIN;

    if (x + reach < minX || x - reach > maxX) continue;
    if (z + reach < minZ || z - reach > maxZ) continue;

    return true;
  }

  return false;
}

export function terrainLightTouchedVersion(): number {
  return touchedVersion;
}

/**
 * Whether the bilinear sample at `(x, z)` reads a tile the dynamic layer may
 * have written: where it is false, `primary` is the bake and `bodyLift` is
 * zero. False everywhere while the layer is idle. The set is the one
 * `terrainLightTouchedVersion` numbers.
 */
export function terrainLightTouchesSample(x: number, z: number): boolean {
  if (!wasActive) return false;

  const xi = Math.floor(x);
  const yi = Math.floor(z);

  return (
    touchedMask[TERRAIN_INDEX_REPEAT(xi, yi)] !== 0 ||
    touchedMask[TERRAIN_INDEX_REPEAT(xi + 1, yi)] !== 0 ||
    touchedMask[TERRAIN_INDEX_REPEAT(xi + 1, yi + 1)] !== 0 ||
    touchedMask[TERRAIN_INDEX_REPEAT(xi, yi + 1)] !== 0
  );
}

export function registerTerrainLight(emitter: TerrainLightEmitter): () => void {
  emitters.add(emitter);
  touchedDirty = true;

  return () => {
    resetTouched();

    emitters.delete(emitter);
    emitterTiles.delete(emitter);
    touchedDirty = true;
  };
}

function rebuildTouched(): void {
  const indices = new Set<number>();

  for (const emitter of emitters) {
    const { x, z } = emitter.position;
    const xi = Math.floor(x);
    const yi = Math.floor(z);
    const range = Math.ceil(emitter.range) + TOUCHED_MARGIN;

    emitterTiles.set(emitter, tileKey(x, z));

    for (let y = yi - range; y <= yi + range; y++) {
      for (let x = xi - range; x <= xi + range; x++) {
        indices.add(TERRAIN_INDEX_REPEAT(x, y));
      }
    }
  }

  if (touched) {
    for (let i = 0; i < touched.length; i++) touchedMask[touched[i]] = 0;
  }

  touched = Int32Array.from(indices);
  touchedDirty = false;

  for (let i = 0; i < touched.length; i++) touchedMask[touched[i]] = 1;
  touchedVersion++;
}

/** Clears the set last written; the rebuild that follows never precedes it. */
function resetTouched(): void {
  if (!primary || !baked || !touched) return;

  for (let i = 0; i < touched.length; i++) {
    const o = touched[i] * CHANNELS;

    primary[o] = baked[o];
    primary[o + 1] = baked[o + 1];
    primary[o + 2] = baked[o + 2];

    if (floor) {
      floor[o] = 0;
      floor[o + 1] = 0;
      floor[o + 2] = 0;
    }

    if (bodyLift) {
      bodyLift[o] = 0;
      bodyLift[o + 1] = 0;
      bodyLift[o + 2] = 0;
    }

    if (deltaBytes) {
      const d = touched[i] * 4;

      deltaBytes[d] = 0;
      deltaBytes[d + 1] = 0;
      deltaBytes[d + 2] = 0;
    }
  }

  deltaDirty = true;
}

/**
 * `share` is what is left for the tile map after the point-light pool has
 * taken this emitter over (`updateTerrainDynamicLight`'s `held`). The tile
 * fields take the shared-out colour; `bodyLift` takes the whole of it, since
 * an object never gets the pool's half added to it - it only ever gets it as
 * a multiplier (`requestBodyTerrainLight`).
 */
function addTerrainLight(
  xf: number,
  yf: number,
  r: number,
  g: number,
  b: number,
  range: number,
  falloff = 1,
  floorGain = 1,
  share = 1
): void {
  if (!primary || !floor) return;

  const xi = Math.floor(xf);
  const yi = Math.floor(yf);

  for (let sy = yi - range; sy <= yi + range; sy++) {
    for (let sx = xi - range; sx <= xi + range; sx++) {
      const xd = xf - sx;
      const yd = yf - sy;
      const linear = (range - Math.sqrt(xd * xd + yd * yd)) / range;

      if (linear <= 0) continue;

      const lf = falloff === 1 ? linear : Math.pow(linear, falloff);

      const o = TERRAIN_INDEX_REPEAT(sx, sy) * CHANNELS;

      if (bodyLift) {
        bodyLift[o] += r * lf;
        bodyLift[o + 1] += g * lf;
        bodyLift[o + 2] += b * lf;
      }

      const sf = lf * share;

      primary[o] = Math.max(0, primary[o] + r * sf);
      primary[o + 1] = Math.max(0, primary[o + 1] + g * sf);
      primary[o + 2] = Math.max(0, primary[o + 2] + b * sf);

      const ff = sf * floorGain;

      floor[o] += r * ff;
      floor[o + 1] += g * ff;
      floor[o + 2] += b * ff;
    }
  }
}

let wasActive = false;

export function updateTerrainDynamicLight(
  elapsedMs: number,
  enabled = true,
  /**
   * Emitters the point-light pool lights per pixel this frame, with the
   * slot's fade: the tile map stamps their remaining share, so a light
   * changing hands never dips. Tiers >= 1 only; Classic keeps every stamp.
   */
  held?: ReadonlyMap<TerrainLightEmitter, number>
): void {
  if (!primary || !baked) return;

  const active = enabled && emitters.size > 0;

  if (!active) {
    if (wasActive) {
      resetTouched();
      touchedVersion++;
    }
    wasActive = false;
    return;
  }

  if (!wasActive) touchedVersion++;
  wasActive = true;

  resetTouched();

  for (const emitter of emitters) {
    const { x, z } = emitter.position;

    if (emitterTiles.get(emitter) !== tileKey(x, z)) touchedDirty = true;
  }

  if (touchedDirty) rebuildTouched();

  for (const emitter of emitters) {
    const share = 1 - (held?.get(emitter) ?? 0);

    const { r, g, b } = emitter.color(elapsedMs);

    addTerrainLight(
      emitter.position.x,
      emitter.position.z,
      r,
      g,
      b,
      emitter.range,
      emitter.falloff ?? 1,
      emitter.floorGain ?? 1,
      share
    );
  }

  if (deltaBytes && touched && floor) {
    const encode = DELTA_ENCODE * dynamicLightGain();

    for (let i = 0; i < touched.length; i++) {
      const o = touched[i] * CHANNELS;
      const d = touched[i] * 4;

      // Hue-preserving soft shoulder. This byte texture tops out at 2.0
      // (decoded `* 2.0` in terrainMaterial), and MU's floor lights are almost
      // pure hue - the candelabra are (1, 0.66, 0.3), the hearths
      // (1, 0.6, 0.35) - so anything done per channel goes wrong twice over.
      //
      // A per-channel `min` pins red at the ceiling while green and blue are
      // still climbing, and the light *changes colour* as it gets stronger:
      // orange at the edge of a pool, saturated red in the middle of one,
      // maroon where six candelabra overlap. That is the same trap as the
      // per-channel clamp in `default.fragment` that made warm light read
      // green (clamped lighting is why warm light reads
      // *green*"), mirrored - clamping the top of a colour throws away the
      // hue, and it is the hue that reads.
      //
      // Scaling the triple by `255 / peak` fixes the colour but not the
      // shape: everything past the ceiling still lands *on* it, so a pool hot
      // enough to clip has a flat blown core with a hard rim where it drops
      // back into the gradient. Bend it instead. Below `DELTA_KNEE` the value
      // is written through; above it the excess is compressed along
      // `1 - exp(-x)`, which approaches the ceiling without ever touching it.
      // Sums stay ordered, gradients survive, and no pool ever goes flat.
      const r = floor[o] * encode;
      const g = floor[o + 1] * encode;
      const b = floor[o + 2] * encode;

      const peak = r > g ? (r > b ? r : b) : g > b ? g : b;

      let k = 1;

      if (peak > DELTA_LINEAR) {
        const shaped =
          DELTA_LINEAR +
          DELTA_ROOM * (1 - Math.exp(-(peak - DELTA_LINEAR) / DELTA_ROOM));

        k = shaped / peak;
      }

      // A negative source (`lighting/characters.ts`) can pull a floor sum
      // below zero, and a Uint8 wraps a negative to bright: the byte has no
      // sign, so the tile map stops at black and the pool carries the dark.
      deltaBytes[d] = Math.max(0, r * k);
      deltaBytes[d + 1] = Math.max(0, g * k);
      deltaBytes[d + 2] = Math.max(0, b * k);
    }

    deltaDirty = true;
  }
}

/**
 * Samples `primary` - the bake plus this frame's dynamic emitters (torches,
 * +9…+15 item lamps, skills), the original's `PrimaryTerrainLight`. This is
 * what BodyLight reads, so a character standing by a torch or next to a
 * glowing drop warms up on every tier, exactly like the ground under them.
 * When the dynamic layer is idle `primary` equals `baked` (resetTouched).
 */
export function requestTerrainLight(
  x: number,
  y: number,
  out: { x: number; y: number; z: number }
): boolean {
  return primary ? sampleBilinear(primary, x, y, out) : false;
}

/**
 * Samples the **baked** lightmap alone (`ZzzLodTerrain.cpp:1011-1012`), no
 * torch delta. The tiers >= 1 body light reads this: there the pool point
 * lights reach a figure per pixel, so the delta would be the same torch a
 * second time (ARCHITECTURE §3.2 `bake_baked_only`).
 */
export function requestBakedTerrainLight(
  x: number,
  y: number,
  out: { x: number; y: number; z: number }
): boolean {
  return baked ? sampleBilinear(baked, x, y, out) : false;
}

const bodyDelta = { x: 0, y: 0, z: 0 };

/**
 * How much of the tile's dynamic light a surface takes as exposure.
 *
 * Not 1: the pooled point light reaches the same surface per pixel and the
 * fragment multiplies the two, so a full-strength floor is the torch counted
 * twice and a statue beside a brazier ends up brighter than the ground it
 * stands on. Enough to give the multiply something to work with, low enough
 * that the pool stays the thing doing the lighting.
 */
const BODY_LIFT_SHARE = 0.6;

/**
 * The tiers >= 1 body light: the bake, never darker than the dynamic light
 * standing on the same tile.
 *
 * The ground and an object do not compose the dynamic layer the same way.
 * The ground *adds* it (`terrainLighting.ts`: `bakeLit + dynLight`), so a
 * torch lights it even where the lightmap is black. An object *multiplies*
 * by it: the fragment is `texel x BodyLight x lightSum` (`itemMaterial.ts`
 * UNCLAMP), and the pooled point lights are inside the sum that BodyLight
 * scales - so with the bake at zero the multiply is by zero and no amount of
 * torch reaches the surface. Atlans bakes whole stretches of walkable ground
 * at (0, 0, 0.02): a monster standing there is a black silhouette in the
 * middle of the player's own lamp while the sand around it lights up. The
 * hero never shows it because `SelfLight` is added to its body light after.
 *
 * So the bake is floored by the light standing on the tile. It reads
 * `bodyLift` and not the delta in `primary`, because the share `primary`
 * gives up to the pool is exactly the share an object cannot use. It is an
 * exact identity wherever the bake already carries the tile (a torch on a
 * lit street) and wherever no emitter is near, so the double count the
 * bake-only rule avoids is untouched.
 */
export function requestBodyTerrainLight(
  x: number,
  y: number,
  out: { x: number; y: number; z: number }
): boolean {
  if (!requestBakedTerrainLight(x, y, out)) return false;

  if (!wasActive || !bodyLift || !sampleBilinear(bodyLift, x, y, bodyDelta)) {
    return true;
  }

  const r = bodyDelta.x * BODY_LIFT_SHARE;
  const g = bodyDelta.y * BODY_LIFT_SHARE;
  const b = bodyDelta.z * BODY_LIFT_SHARE;

  if (r > out.x) out.x = r;
  if (g > out.y) out.y = g;
  if (b > out.z) out.z = b;

  return true;
}

function sampleBilinear(
  field: Float32Array,
  x: number,
  y: number,
  out: { x: number; y: number; z: number }
): boolean {
  const xi = Math.floor(x);
  const yi = Math.floor(y);

  if (xi < 0 || yi < 0 || xi >= TERRAIN_SIZE - 1 || yi >= TERRAIN_SIZE - 1) {
    return false;
  }

  const i1 = TERRAIN_INDEX(xi, yi) * CHANNELS;
  const i2 = TERRAIN_INDEX(xi + 1, yi) * CHANNELS;
  const i3 = TERRAIN_INDEX(xi + 1, yi + 1) * CHANNELS;
  const i4 = TERRAIN_INDEX(xi, yi + 1) * CHANNELS;

  const xd = x - xi;
  const yd = y - yi;

  out.x = bilinearChannel(field, i1, i2, i3, i4, xd, yd);
  out.y = bilinearChannel(field, i1 + 1, i2 + 1, i3 + 1, i4 + 1, xd, yd);
  out.z = bilinearChannel(field, i1 + 2, i2 + 2, i3 + 2, i4 + 2, xd, yd);

  return true;
}

function bilinearChannel(
  field: Float32Array,
  i1: number,
  i2: number,
  i3: number,
  i4: number,
  xd: number,
  yd: number
): number {
  const left = field[i1] + (field[i4] - field[i1]) * yd;
  const right = field[i2] + (field[i3] - field[i2]) * yd;

  return left + (right - left) * xd;
}

export function packBakedTerrainLight(
  light: readonly IVector3Like[],
  lift: number
): Float32Array {
  const packed = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE * CHANNELS);
  const scale = 1 - lift;

  for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
    const v = light[i];
    const o = i * CHANNELS;

    packed[o] = v ? lift + v.x * scale : lift;
    packed[o + 1] = v ? lift + v.y * scale : lift;
    packed[o + 2] = v ? lift + v.z * scale : lift;
  }

  return packed;
}

