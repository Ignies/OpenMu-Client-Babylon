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
  readonly x: number;
  readonly y: number;
  readonly range: number;
  readonly falloff?: number;
  readonly floorGain?: number;
  color(elapsedMs: number): TerrainLightColor;
};

const CHANNELS = 3;

let baked: Float32Array | null = null;

let primary: Float32Array | null = null;

let floor: Float32Array | null = null;

const DELTA_ENCODE = 127.5;

/**
 * Where the encode stops being linear, as a fraction of the byte range.
 *
 * Below this the floor light is written through untouched. Above it the sum
 * bends toward the ceiling along an exponential and never reaches it, so two
 * candelabra whose pools overlap read as brighter than one and not as a flat
 * plateau. A hard clamp is what forced the emitters to be tuned as tight hot
 * cores in the first place — see the note in devias/candleObject.ts — because
 * any generous tail summed straight into the ceiling and erased the gradient
 * the pools were supposed to read against.
 */
const DELTA_KNEE = 0.55;
const DELTA_LINEAR = 255 * DELTA_KNEE;
const DELTA_ROOM = 255 - DELTA_LINEAR;
let deltaBytes: Uint8Array | null = null;
let deltaDirty = false;

const emitters = new Set<TerrainLightEmitter>();

let touched: Int32Array | null = null;
let touchedDirty = true;

export function initTerrainDynamicLight(liftedBaked: Float32Array): void {
  baked = liftedBaked;
  primary = liftedBaked.slice();
  floor = new Float32Array(liftedBaked.length);
  deltaBytes = new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE * 4);
  // Alpha is not light (see writeTerrainOpenness). Open sky until something
  // says otherwise, so a map whose mask has not been built yet reads as
  // outdoors rather than as one enormous roof.
  for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
    deltaBytes[i * 4 + 3] = 255;
  }
  deltaDirty = true;
  emitters.clear();
  touched = null;
  touchedDirty = true;
}

export function disposeTerrainDynamicLight(): void {
  baked = null;
  primary = null;
  floor = null;
  deltaBytes = null;
  emitters.clear();
  touched = null;
  touchedDirty = true;
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
 * comments twice record how brittle its sampler list is — a sampler declared
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

export function registerTerrainLight(emitter: TerrainLightEmitter): () => void {
  emitters.add(emitter);
  touchedDirty = true;

  return () => {
    resetTouched();

    emitters.delete(emitter);
    touchedDirty = true;
  };
}

function rebuildTouched(): void {
  const indices = new Set<number>();

  for (const emitter of emitters) {
    const xi = Math.floor(emitter.x);
    const yi = Math.floor(emitter.y);
    const range = emitter.range;

    for (let y = yi - range; y <= yi + range; y++) {
      for (let x = xi - range; x <= xi + range; x++) {
        indices.add(TERRAIN_INDEX_REPEAT(x, y));
      }
    }
  }

  touched = Int32Array.from(indices);
  touchedDirty = false;
}

function resetTouched(): void {
  if (!primary || !baked) return;
  if (touchedDirty) rebuildTouched();
  if (!touched) return;

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

    if (deltaBytes) {
      const d = touched[i] * 4;

      deltaBytes[d] = 0;
      deltaBytes[d + 1] = 0;
      deltaBytes[d + 2] = 0;
    }
  }

  deltaDirty = true;
}

function addTerrainLight(
  xf: number,
  yf: number,
  r: number,
  g: number,
  b: number,
  range: number,
  falloff = 1,
  floorGain = 1
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

      primary[o] = Math.max(0, primary[o] + r * lf);
      primary[o + 1] = Math.max(0, primary[o + 1] + g * lf);
      primary[o + 2] = Math.max(0, primary[o + 2] + b * lf);

      const ff = lf * floorGain;

      floor[o] += r * ff;
      floor[o + 1] += g * ff;
      floor[o + 2] += b * ff;
    }
  }
}

let wasActive = false;

export function updateTerrainDynamicLight(
  elapsedMs: number,
  enabled = true
): void {
  if (!primary || !baked) return;

  const active = enabled && emitters.size > 0;

  if (!active) {
    if (wasActive) resetTouched();
    wasActive = false;
    return;
  }

  wasActive = true;

  resetTouched();

  for (const emitter of emitters) {
    const { r, g, b } = emitter.color(elapsedMs);

    addTerrainLight(
      emitter.x,
      emitter.y,
      r,
      g,
      b,
      emitter.range,
      emitter.falloff ?? 1,
      emitter.floorGain ?? 1
    );
  }

  if (deltaBytes && touched && floor) {
    const encode = DELTA_ENCODE * dynamicLightGain();

    for (let i = 0; i < touched.length; i++) {
      const o = touched[i] * CHANNELS;
      const d = touched[i] * 4;

      // Hue-preserving soft shoulder. This byte texture tops out at 2.0
      // (decoded `* 2.0` in terrainMaterial), and MU's floor lights are almost
      // pure hue — the candelabra are (1, 0.66, 0.3), the hearths
      // (1, 0.6, 0.35) — so anything done per channel goes wrong twice over.
      //
      // A per-channel `min` pins red at the ceiling while green and blue are
      // still climbing, and the light *changes colour* as it gets stronger:
      // orange at the edge of a pool, saturated red in the middle of one,
      // maroon where six candelabra overlap. That is the same trap as the
      // per-channel clamp in `default.fragment` that made warm light read
      // green (clamped lighting is why warm light reads
      // *green*"), mirrored — clamping the top of a colour throws away the
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

      deltaBytes[d] = r * k;
      deltaBytes[d + 1] = g * k;
      deltaBytes[d + 2] = b * k;
    }

    deltaDirty = true;
  }
}

/**
 * Samples `primary` — the bake plus this frame's dynamic emitters (torches,
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
  if (!primary) return false;

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

  const channel = (c: number) => {
    const left = primary![i1 + c] + (primary![i4 + c] - primary![i1 + c]) * yd;
    const right = primary![i2 + c] + (primary![i3 + c] - primary![i2 + c]) * yd;

    return left + (right - left) * xd;
  };

  out.x = channel(0);
  out.y = channel(1);
  out.z = channel(2);

  return true;
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

