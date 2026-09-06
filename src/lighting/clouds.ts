import {
  Constants,
  RawTexture,
  Texture,
  type Effect,
  type Scene,
} from '../libs/babylon/exports';
import { GameOptions } from '../common/gameOptions';
import { devQueryNumber } from '../common/devSeams';
import { lightingTier } from '../common/lightingQuality';
import { serverNow } from '../common/serverTime';

/**
 * The cloud field (sky_atmospherics ARCHITECTURE §4): one producer, read by
 * the sky dome, the terrain and the item materials.
 *
 * One tiling value-noise texture generated once from a fixed seed carries the
 * shape; coverage and wind are pure functions of `serverNow()`. The dome
 * draws the field and the sun receivers sample the same field along the sun
 * ray, so a shadow on the ground always has the cloud that casts it overhead,
 * and two clients on the same map at the same second see the same sky.
 *
 * No render pass: the shadow is two texture fetches on a fragment that was
 * already shading.
 */

/**
 * The field's resolution. It has to be high enough that one texel is a couple
 * of pixels where the deck is drawn: the coverage threshold turns a smooth
 * field into a contour, and a contour through 25-pixel texels kinks along the
 * texel grid and reads as rectangles.
 */
const NOISE_SIZE = 512;

/** Altitude of the cloud deck and its thickness, in tiles. */
export const CLOUD_ALT = 60;
export const CLOUD_THICK = 20;

/** Tiles a second the deck drifts. */
const WIND = [0.55, 0.32] as const;

/** How wide the coverage threshold's soft edge is. */
const CLOUD_SOFT = 0.3;

/** Slow drift around the map's base coverage, and the slot it is rolled in. */
const DRIFT = 0.18;
const DRIFT_PERIOD_MS = 300_000;

/** What a fully covered sky removes from the sun. */
const SHADOW_STRENGTH = 0.55;

export const CLOUD_NOISE_SAMPLER = 'muCloudNoise';

const coverDev = devQueryNumber('clouds');
const cloudDev = devQueryNumber('cloudShadow');

/** Uniform names the readers declare and `bindClouds` writes. */
export const CLOUD_UNIFORMS = ['muCloudA', 'muCloudB', 'muCloudC'] as const;

/** World tiles one wrap of the field covers, per octave. */
const OCTAVE_SCALE = [0.0105, 0.031] as const;

/** Wrapped into [0, 1): a scroll of epoch seconds is millions of UV units, and
 * a float there has no fractional resolution left, which quantises the whole
 * texture read into blocks. Wrapping is exact in a double and costs nothing. */
const wrapUv = (v: number): number => ((v % 1) + 1) % 1;

let noise: RawTexture | null = null;
let noiseScene: Scene | null = null;

/** The same integer hash the ambient weather schedule rolls from. */
function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b) ^ seed) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 0x100000000;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** One octave of tiling value noise at `cells` cells across the texture. */
function octave(data: Float32Array, cells: number, weight: number, seed: number): void {
  const step = NOISE_SIZE / cells;

  for (let y = 0; y < NOISE_SIZE; y++) {
    const gy = y / step;
    const y0 = Math.floor(gy);
    const fy = smooth(gy - y0);

    for (let x = 0; x < NOISE_SIZE; x++) {
      const gx = x / step;
      const x0 = Math.floor(gx);
      const fx = smooth(gx - x0);

      // Wrapped corners, so the texture tiles in both directions.
      const a = hash(x0 % cells, y0 % cells, seed);
      const b = hash((x0 + 1) % cells, y0 % cells, seed);
      const c = hash(x0 % cells, (y0 + 1) % cells, seed);
      const d = hash((x0 + 1) % cells, (y0 + 1) % cells, seed);

      const top = a + (b - a) * fx;
      const bottom = c + (d - c) * fx;

      data[y * NOISE_SIZE + x] += (top + (bottom - top) * fy) * weight;
    }
  }
}

/**
 * The field texture: four octaves, RGBA, 1 MB. Built once and
 * kept for the session; it is the same on every client because every value
 * comes from the hash above and nothing from `Math.random`.
 */
function cloudNoise(scene: Scene): RawTexture {
  if (noise && noiseScene === scene) return noise;

  const acc = new Float32Array(NOISE_SIZE * NOISE_SIZE);

  octave(acc, 4, 0.50, 0x1a2b3c4d);
  octave(acc, 8, 0.27, 0x5e6f7a8b);
  octave(acc, 16, 0.15, 0x9cadbecf);
  octave(acc, 32, 0.08, 0xd0e1f203);

  // Three averaged octaves of value noise pile up around the middle, so the
  // raw field never reaches the coverage threshold and the sky stays empty.
  // Stretching it onto its own range is what makes `coverage` mean the share
  // of sky it says it is.
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of acc) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;

  const bytes = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4);
  for (let i = 0; i < acc.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(((acc[i] - lo) / span) * 255)));
    bytes[i * 4] = v;
    bytes[i * 4 + 1] = v;
    bytes[i * 4 + 2] = v;
    bytes[i * 4 + 3] = 255;
  }

  // No mip chain on purpose. A view ray meets the cloud plane at a distance
  // that changes fast across the screen, so the UV derivatives are enormous
  // and the hardware picks a mip a few texels wide; thresholding a bilinear
  // read of that is what turned the deck into axis-aligned squares. The field
  // is low frequency (a cell is about 60 tiles), so level 0 does not alias.
  const texture = RawTexture.CreateRGBATexture(
    bytes,
    NOISE_SIZE,
    NOISE_SIZE,
    scene,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE
  );

  texture.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
  texture.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
  texture.name = 'cloudNoise';

  noise = texture;
  noiseScene = scene;

  return texture;
}

export function disposeClouds(): void {
  noise?.dispose();
  noise = null;
  noiseScene = null;
}

/** True while the option, the tier and the map all want a cloud deck. */
export function cloudsActive(base: number | null): boolean {
  if (base === null || !lightingTier() || !GameOptions.clouds) return false;

  return coverage(base) > 0.01;
}

/** A smoothed hash walk over five-minute slots; the same on every client. */
function drift(nowMs: number): number {
  const slot = Math.floor(nowMs / DRIFT_PERIOD_MS);
  const t = smooth((nowMs % DRIFT_PERIOD_MS) / DRIFT_PERIOD_MS);
  const a = hash(slot, 0, 0xc10d5eed) * 2 - 1;
  const b = hash(slot + 1, 0, 0xc10d5eed) * 2 - 1;

  return a + (b - a) * t;
}

export function coverage(base: number): number {
  if (coverDev !== null) return Math.max(0, Math.min(1, coverDev));

  return Math.max(0, Math.min(0.95, base + DRIFT * drift(serverNow())));
}

function shadowStrength(sunElevationDeg: number): number {
  if (cloudDev !== null) return Math.max(0, cloudDev);

  // A grazing sun throws long, faint cloud shadows; a high one throws the
  // deck's own silhouette.
  const lift = Math.sin(Math.max(0, sunElevationDeg) * (Math.PI / 180));

  return SHADOW_STRENGTH * (0.35 + 0.65 * lift);
}

/**
 * What every reader binds. `muCloudA` is (wind x, wind z, coverage, shadow
 * strength) and `muCloudB` is (sun step x, sun step z, altitude, thickness):
 * the step is the horizontal distance the sun ray covers per unit of height,
 * so a receiver walks straight up it to the deck.
 */
export function bindClouds(
  effect: Effect,
  scene: Scene,
  look: {
    base: number | null;
    sunDirection: readonly [number, number, number];
    sunElevationDeg: number;
  }
): void {
  effect.setTexture(CLOUD_NOISE_SAMPLER, cloudNoise(scene));

  const live = cloudsActive(look.base);
  const cover = live ? coverage(look.base ?? 0) : 0;
  const t = serverNow() / 1000;

  // The two octaves scroll at their own rates, and each offset is handed over
  // already in UV units and already wrapped.
  effect.setFloat4(
    'muCloudA',
    wrapUv(WIND[0] * t * OCTAVE_SCALE[0] * 0.38),
    wrapUv(WIND[1] * t * OCTAVE_SCALE[0] * 0.38),
    cover,
    live ? shadowStrength(look.sunElevationDeg) : 0
  );

  effect.setFloat4(
    'muCloudC',
    wrapUv(-WIND[0] * t * OCTAVE_SCALE[1] * 0.34),
    wrapUv(-WIND[1] * t * OCTAVE_SCALE[1] * 0.34),
    0,
    0
  );

  // The light travels along `sunDirection`, so a point walks against it to
  // reach the deck. A near-horizontal sun would send the step to infinity;
  // it is capped at the deck's own width.
  const d = look.sunDirection;
  const down = Math.max(0.15, -d[1]);

  effect.setFloat4(
    'muCloudB',
    -d[0] / down,
    -d[2] / down,
    CLOUD_ALT,
    CLOUD_THICK
  );
}

/**
 * The field and the shadow, shared verbatim by the sky and by every sun
 * receiver so the two can never disagree. `declare` is false where the host
 * already emits the uniforms itself (the item materials do, through
 * `AddUniform`), or the fragment declares them twice and will not compile.
 * receiver so the two can never disagree. Two scrolls at two scales are what
 * make one tile read as a moving, evolving sky.
 */
export function cloudFieldGlsl(declare = true): string {
  return `
${
  declare
    ? `  uniform sampler2D ${CLOUD_NOISE_SAMPLER};
  uniform vec4 muCloudA;   // octave 1 scroll uv, coverage, shadow strength
  uniform vec4 muCloudB;   // sun step x, sun step z, altitude, thickness
  uniform vec4 muCloudC;   // octave 2 scroll uv`
    : ''
}

  /**
   * Bilinear filtering reconstructs a texture as a bilinear patch per texel,
   * and thresholding that leaves the patch edges visible: the deck came out
   * as axis-aligned squares wherever a texel was more than a few pixels
   * wide, which up at the cloud plane it always is. Easing the fractional
   * part before the fetch makes the reconstruction smooth, at no extra
   * sample.
   */
  vec2 muSmoothUV(vec2 uv) {
    vec2 t = uv * ${NOISE_SIZE}.0 + 0.5;
    vec2 i = floor(t);
    vec2 f = fract(t);

    return (i + f * f * (3.0 - 2.0 * f) - 0.5) / ${NOISE_SIZE}.0;
  }

  float muCloudField(vec2 p) {
    float a = texture2D(${CLOUD_NOISE_SAMPLER}, muSmoothUV(fract(p * ${OCTAVE_SCALE[0]} + muCloudA.xy))).r;
    float b = texture2D(${CLOUD_NOISE_SAMPLER}, muSmoothUV(fract(p * ${OCTAVE_SCALE[1]} + muCloudC.xy))).r;

    return a * 0.65 + b * 0.35;
  }

  float muCloudCover(vec2 p) {
    float edge = 1.0 - muCloudA.z;

    return smoothstep(edge, edge + ${CLOUD_SOFT.toFixed(3)}, muCloudField(p));
  }

  /** 1 in the open, less under a cloud. Identity while the strength is 0. */
  float muCloudShadow(vec3 worldPos) {
    if (muCloudA.w <= 0.0) return 1.0;

    float rise = max(muCloudB.z - worldPos.y, 0.0);
    vec2 p = worldPos.xz + muCloudB.xy * rise;

    return 1.0 - muCloudA.w * muCloudCover(p);
  }
`;
}
