/**
 * Reading a map's own tile art: how much a fragment of ground ALREADY is the
 * substance a terrain overlay draws.
 *
 * A leaf module on purpose. The numbers below were set against the textures
 * the maps ship, and `snowArtMatch.test.ts` pins them to those measurements -
 * which only works if the test can import this without dragging the store,
 * the scene and the weather clock in behind it.
 */

/**
 * What a layer's substance looks like in tile art, as two ramps over the
 * resolved splat albedo. `lum` is `[start, full]` on luminance and `chroma`
 * is `[start, gone]` on saturation, so the match climbs with brightness and
 * falls away with colour.
 */
export type ArtMatch = {
  readonly lum: readonly [number, number];
  readonly chroma: readonly [number, number];
};

/** GLSL's smoothstep. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * How much this albedo already IS the substance, 0…1. The CPU twin of the
 * shader's `ovArtMatch`; both read the colour in the tile textures' own
 * space, which is where the overlay body runs - the linear decode is the last
 * line of the terrain fragment, long after it.
 */
export function artMatch(
  spec: ArtMatch,
  r: number,
  g: number,
  b: number
): number {
  const mx = Math.max(r, Math.max(g, b));
  const mn = Math.min(r, Math.min(g, b));
  const chroma = mx > 0 ? (mx - mn) / mx : 0;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (
    smoothstep(spec.lum[0], spec.lum[1], lum) *
    (1 - smoothstep(spec.chroma[0], spec.chroma[1], chroma))
  );
}

/**
 * Snow as the maps paint it, measured off the shipped tiles
 * (`Data/World<n>/Tile*.OZJ`, mean sRGB).
 *
 * Devias' snow grass sits at 0.89 luminance and 0.07 chroma and its snow rock
 * at 0.80 / 0.17, so both are read as snow and the settled layer leaves them
 * alone. Its grey field ground (0.45) and its cobbles (0.60) are under the
 * ramp and take the layer as before, which is what keeps the field
 * continuous. Santa Town's dark grass (0.31) takes it too - a snow village
 * over dark ground is exactly what the layer is for.
 *
 * Chroma is not a refinement, it is half the test: Santa Town's water and the
 * ice fields' blue ice are as bright as a drift (0.66, 0.75) and nothing like
 * as grey, and luminance alone would call all three snow.
 */
export const SNOW_ART: ArtMatch = {
  lum: [0.62, 0.85],
  chroma: [0.16, 0.34],
};
