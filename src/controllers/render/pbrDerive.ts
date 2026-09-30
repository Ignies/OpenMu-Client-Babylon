/**
 * The PBR map derivation, pure: RGBA8 in, three RGBA8 maps out. No Babylon
 * and no DOM, so `pbrMaps.worker.ts` can run it off the main thread.
 *
 * MU's art is diffuse-only, so the maps are derived from it: height-from-luma
 * normals, metalness from the palette (desaturated mid/high-luma pixels are
 * metal, saturated ones are cloth/leather/skin), roughness from metal +
 * highlight density, and an emissive mask over saturated *bright* pixels -
 * the gems and gold trim that should feed the GlowLayer.
 */

export type DerivedMaps = {
  normal: Uint8Array;
  metallicRoughness: Uint8Array;
  /** Null when the derivation found nothing worth glowing. */
  emissive: Uint8Array | null;
};

/**
 * Height scale for the normal derivation (luma 0..1 -> texels of relief),
 * applied to the *normalised* Sobel gradient - see `SOBEL_NORM`.
 */
const NORMAL_STRENGTH = 1.4;

/**
 * Sobel kernel weight, which the gradient must be divided by to read as a
 * per-texel slope. Without it the raw kernel output spans +-4 for luma in
 * 0..1, so the old `gradient * 2.2` bent the average normal of Lorencia's
 * wood and stone by 30-58 degrees (measured over tile_wood01 / bookshelf /
 * desk_big / c_wall04) and its 95th percentile past 70. That is not relief -
 * it is a per-texel randomisation of N.L, and it is why Enhanced read as
 * blotchy, smeared and mis-lit next to Classic. MU's art is 128 squared,
 * JPEG-compressed and has its shading painted in, so block ringing and dither
 * become 'geometry' at any real strength. Normalised, the same textures land
 * at 4-10 degrees average and 12-20 at p95 - a surface that catches the
 * torches without fighting the art.
 */
const SOBEL_NORM = 1 / 8;

/**
 * Cap on derived metalness. The palette heuristic cannot tell gold from
 * warm-lit oak, and every texel it gets wrong costs diffuse (up to 17 %) and
 * pays it back as a highlight nobody sees without an environment map, so
 * derived metal is 0: metal comes from authored `Data/PBR` maps only
 * (ARCHITECTURE 4.7).
 */
const METAL_MAX = 0;
/** Saturation below which a texel may read as metal (1 / this slope). */
const METAL_SAT_SLOPE = 5;
const ROUGH_MIN = 0.55;
export const ROUGH_MAX = 0.95;
/** Share of the texture that must be emissive before a map is worth binding. */
const EMISSIVE_MIN_COVERAGE = 0.002;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Reverses the row order of an RGBA8 image in place. A texture uploaded with
 * `invertY` sits flipped on the GPU relative to its file, and the derived
 * maps are uploaded unflipped, so they are derived from the GPU's row order.
 */
export function flipRows(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): void {
  const stride = width * 4;
  const row = new Uint8Array(stride);

  for (let y = 0; y < height >> 1; y++) {
    const top = y * stride;
    const bottom = (height - 1 - y) * stride;
    row.set(rgba.subarray(top, top + stride));
    rgba.copyWithin(top, bottom, bottom + stride);
    rgba.set(row, bottom);
  }
}

/** Pure derivation over RGBA8 pixels (row-major, `width` x `height`). */
export function derivePbrMaps(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): DerivedMaps {
  const count = width * height;
  const luma = new Float32Array(count);
  const sat = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = rgba[i * 4] / 255;
    const g = rgba[i * 4 + 1] / 255;
    const b = rgba[i * 4 + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    sat[i] = max > 0 ? (max - min) / max : 0;
  }

  const normal = new Uint8Array(count * 4);
  const metallicRoughness = new Uint8Array(count * 4);
  const emissive = new Uint8Array(count * 4);
  let emissiveCoverage = 0;

  const at = (x: number, y: number) =>
    luma[((y + height) % height) * width + ((x + width) % width)];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      // Sobel height gradient (wrapping - MU textures tile).
      const dx =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy =
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));

      let nx = -dx * SOBEL_NORM * NORMAL_STRENGTH;
      let ny = -dy * SOBEL_NORM * NORMAL_STRENGTH;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;

      normal[i * 4] = (nx * 0.5 + 0.5) * 255;
      normal[i * 4 + 1] = (ny * 0.5 + 0.5) * 255;
      normal[i * 4 + 2] = (nz * 0.5 + 0.5) * 255;
      normal[i * 4 + 3] = 255;

      const l = luma[i];
      const s = sat[i];

      const metal =
        Math.max(0, Math.min(1, 1 - s * METAL_SAT_SLOPE)) *
        smoothstep(0.2, 0.55, l) *
        METAL_MAX;
      const rough = Math.max(
        ROUGH_MIN,
        Math.min(
          ROUGH_MAX,
          0.9 - 0.45 * metal - 0.3 * smoothstep(0.5, 0.9, l)
        )
      );

      // glTF layout: G roughness, B metalness (R is free - AO, left white).
      metallicRoughness[i * 4] = 255;
      metallicRoughness[i * 4 + 1] = rough * 255;
      metallicRoughness[i * 4 + 2] = metal * 255;
      metallicRoughness[i * 4 + 3] = 255;

      const mask = smoothstep(0.65, 0.95, l) * smoothstep(0.55, 0.85, s);
      emissive[i * 4] = rgba[i * 4] * mask;
      emissive[i * 4 + 1] = rgba[i * 4 + 1] * mask;
      emissive[i * 4 + 2] = rgba[i * 4 + 2] * mask;
      emissive[i * 4 + 3] = 255;
      if (mask > 0.5) emissiveCoverage++;
    }
  }

  return {
    normal,
    metallicRoughness,
    emissive:
      emissiveCoverage / count >= EMISSIVE_MIN_COVERAGE ? emissive : null,
  };
}
