import { RawTexture, Texture, type Scene } from '../libs/babylon/exports';

/**
 * A round opacity mask repeated once per sheet cell, for a card whose art has
 * value at its cell's border. The original's JPEG sheets are not black at the
 * edge (Explotion01's late frames sit on a dark grey), and on the graded tiers
 * `lightCardGain` lifts that grey into a visible square. The mask fades each
 * cell to nothing before its edge, so the card reads as the burst it draws.
 * One texture per (scene, grid), shared by every material that asks.
 */

const MASK_SIZE = 64;
/**
 * Radius, as a share of the half cell, where the fade starts and where it reaches 0, and whether it eases.
 * `cell`: a sheet's own cells (smoothstep 0.55 to 0.97). `card`: a whole card whose art runs to the quad's
 * border and reads as a square once many overlap (linear, full inside 0.4, none at the edge).
 */
const PROFILES = {
  cell: { from: 0.55, to: 0.97, ease: true },
  card: { from: 0.4, to: 1, ease: false },
} as const;
type Profile = keyof typeof PROFILES;

const masks = new Map<Scene, Map<string, Texture>>();
const pixels = new Map<Profile, Uint8Array>();

function maskPixels(profile: Profile): Uint8Array {
  let px = pixels.get(profile);
  if (px) return px;
  const { from, to, ease } = PROFILES[profile];
  px = new Uint8Array(MASK_SIZE * MASK_SIZE * 4);
  const half = MASK_SIZE / 2;
  for (let y = 0; y < MASK_SIZE; y++) {
    for (let x = 0; x < MASK_SIZE; x++) {
      const r = Math.hypot(x + 0.5 - half, y + 0.5 - half) / half;
      const k = Math.min(1, Math.max(0, (r - from) / (to - from)));
      const a = Math.round(255 * (1 - (ease ? k * k * (3 - 2 * k) : k)));
      const i = (y * MASK_SIZE + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = a;
    }
  }
  pixels.set(profile, px);
  return px;
}

/** The mask for a sheet of `cols` x `rows` cells (1 x 1 for a single image); `wide` is the `card` falloff. */
export function softEdgeMask(scene: Scene, cols: number, rows: number, wide = false): Texture {
  const profile: Profile = wide ? 'card' : 'cell';
  let byGrid = masks.get(scene);
  if (!byGrid) {
    byGrid = new Map();
    masks.set(scene, byGrid);
  }
  const key = `${cols}x${rows}${wide ? 'w' : ''}`;
  let tex = byGrid.get(key);
  if (tex) return tex;
  tex = RawTexture.CreateRGBATexture(maskPixels(profile), MASK_SIZE, MASK_SIZE, scene, false, false, Texture.BILINEAR_SAMPLINGMODE);
  tex.name = `fxSoftEdge${key}`;
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = cols;
  tex.vScale = rows;
  byGrid.set(key, tex);
  return tex;
}

/** Drop every mask (the effects facade's reset, after the materials that sample them). */
export function disposeSoftEdgeMasks(): void {
  for (const byGrid of masks.values()) for (const t of byGrid.values()) t.dispose();
  masks.clear();
}
