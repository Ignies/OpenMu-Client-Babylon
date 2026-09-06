import {
  Constants,
  RawTexture,
  type Effect,
  type Scene,
} from '../babylon/exports';
import {
  materialQuality,
  pbrDetailStrength,
  textureFiltering,
} from '../../common/materialQuality';

/**
 * The ground's near grain: one tiling noise texture, generated once, that
 * modulates the terrain's own colour a few tiles from the camera and is gone
 * by the middle distance.
 *
 * MU's ground textures are 64 to 128 pixels over several tiles, which the
 * ported camera never has a problem with - it looks down from twelve tiles up
 * and no texel is ever more than a couple of pixels across. The first-person
 * step put the eye 1.6 tiles off the ground, where the same texel covers a
 * tenth of the screen and the ground under the player dissolves into a smear.
 * Nothing can put resolution back into the art, but the ground does not have
 * to be smooth while it is missing.
 *
 * It is a luminance modulation on the art, applied before the light: the
 * ground keeps its own colour and its own brightness, and only gains a grain
 * to hold the eye at close range. Identity on Classic, and with the material
 * detail slider at 0.
 */

/** Texels across the tiling grain. */
const SIZE = 256;

/** Wraps of the grain per world tile. */
const DETAIL_SCALE = 0.75;

/**
 * View depth the grain fades over, in tiles. The ported camera sits twelve
 * tiles up and the ground under the hero is fifteen to twenty away, so the
 * whole effect is already gone at every ported zoom level; this is the eye's
 * own.
 */
const DETAIL_NEAR = 4;
const DETAIL_FAR = 14;

/** The most the grain moves the art, at the top of the detail slider. */
const DETAIL_STRENGTH = 0.4;

/**
 * Mip bias on the fetch.
 *
 * The ground at eye height is seen at a grazing angle, which is the case the
 * mip chain exists to blur: at zero bias the hardware picks a level several
 * texels wide and every fetch comes back at the field's mean, which is exactly
 * the flat ground this is here to break up. Two levels of bias holds the grain
 * over the range it is drawn in, and the fade above keeps it from reaching the
 * distance where it would crawl.
 */
const DETAIL_LOD_BIAS = -2;

export const TERRAIN_DETAIL_SAMPLER = 'muGroundGrainMap';
export const TERRAIN_DETAIL_UNIFORM = 'muGroundGrainStrength';

let grain: RawTexture | null = null;
let grainScene: Scene | null = null;

/** The same integer hash the cloud field is built from. */
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
  const step = SIZE / cells;

  for (let y = 0; y < SIZE; y++) {
    const gy = y / step;
    const y0 = Math.floor(gy);
    const fy = smooth(gy - y0);

    for (let x = 0; x < SIZE; x++) {
      const gx = x / step;
      const x0 = Math.floor(gx);
      const fx = smooth(gx - x0);

      const a = hash(x0 % cells, y0 % cells, seed);
      const b = hash((x0 + 1) % cells, y0 % cells, seed);
      const c = hash(x0 % cells, (y0 + 1) % cells, seed);
      const d = hash((x0 + 1) % cells, (y0 + 1) % cells, seed);

      const top = a + (b - a) * fx;
      const bottom = c + (d - c) * fx;

      data[y * SIZE + x] += (top + (bottom - top) * fy) * weight;
    }
  }
}

/**
 * Four octaves, the finest at one texel per cell, normalised so the mean sits
 * at 0.5 and the modulation is as often up as down.
 *
 * Mips, unlike the cloud field: this one is read across the whole depth range
 * at a grazing angle, which is the case the hardware's trilinear and
 * anisotropy exist for, and without them the grain crawls.
 */
function grainTexture(scene: Scene): RawTexture {
  if (grain && grainScene === scene) return grain;

  // A new scene: the old one's texture goes with it.
  grain?.dispose();

  const acc = new Float32Array(SIZE * SIZE);

  octave(acc, 16, 0.42, 0x37a1b2c3);
  octave(acc, 32, 0.28, 0x48b2c3d4);
  octave(acc, 64, 0.19, 0x59c3d4e5);
  octave(acc, 128, 0.11, 0x6ad4e5f6);

  let lo = Infinity;
  let hi = -Infinity;
  for (const v of acc) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;

  const bytes = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < acc.length; i++) {
    const v = Math.round(((acc[i] - lo) / span) * 255);
    bytes[i * 4] = v;
    bytes[i * 4 + 1] = v;
    bytes[i * 4 + 2] = v;
    bytes[i * 4 + 3] = 255;
  }

  const { sampling, anisotropy } = textureFiltering();

  const texture = RawTexture.CreateRGBATexture(
    bytes,
    SIZE,
    SIZE,
    scene,
    true,
    false,
    sampling
  );

  texture.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
  texture.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = anisotropy;
  texture.name = 'groundGrain';

  grain = texture;
  grainScene = scene;

  return texture;
}


/** 0 on Classic and with the detail slider down, which compiles to identity. */
function strength(): number {
  if (!materialQuality()) return 0;

  return DETAIL_STRENGTH * pbrDetailStrength();
}

export function bindTerrainDetail(effect: Effect, scene: Scene): void {
  effect.setTexture(TERRAIN_DETAIL_SAMPLER, grainTexture(scene));
  effect.setFloat(TERRAIN_DETAIL_UNIFORM, strength());
}

/** What the ground multiplies its art by. 1 while the strength is 0. */
export function terrainDetailGlsl(): string {
  return `
  uniform sampler2D ${TERRAIN_DETAIL_SAMPLER};
  uniform float ${TERRAIN_DETAIL_UNIFORM};

  float muGroundGrain(vec2 worldXZ, float viewZ) {
    if (${TERRAIN_DETAIL_UNIFORM} <= 0.0) return 1.0;

    float w = ${TERRAIN_DETAIL_UNIFORM} * (1.0 - smoothstep(
      ${DETAIL_NEAR.toFixed(1)},
      ${DETAIL_FAR.toFixed(1)},
      viewZ
    ));

    if (w <= 0.0) return 1.0;

    float n = texture2D(
      ${TERRAIN_DETAIL_SAMPLER},
      worldXZ * ${DETAIL_SCALE},
      ${DETAIL_LOD_BIAS.toFixed(1)}
    ).r;

    return 1.0 + (n - 0.5) * w;
  }
`;
}
