import {
  Constants,
  RawTexture,
  Texture,
  type BaseTexture,
  type Scene,
} from '../libs/babylon/exports';
import { resolveDataUrl } from '../libs/mu/dataFolder';

/**
 * PBR map sets for the Enhanced material ("authored maps").
 *
 * MU's art is diffuse-only, so the maps are derived from it: height-from-luma
 * normals, metalness from the palette (desaturated mid/high-luma pixels are
 * metal, saturated ones are cloth/leather/skin), roughness from metal +
 * highlight density, and an emissive mask over saturated *bright* pixels —
 * the gems and gold trim that should feed the GlowLayer.
 *
 * Hand-authored maps win over the derivation: `Data/PBR/manifest.json` maps a
 * texture's source name to files under `Data/PBR/`. Missing manifest = all
 * derived; missing entry = derived for that texture.
 */

export type PbrMapSet = {
  normal: BaseTexture;
  metallicRoughness: BaseTexture;
  /** Null when the derivation found nothing worth glowing. */
  emissive: BaseTexture | null;
};

export type DerivedMaps = {
  normal: Uint8Array;
  metallicRoughness: Uint8Array;
  emissive: Uint8Array | null;
};

/**
 * Height scale for the normal derivation (luma 0..1 → texels of relief),
 * applied to the *normalised* Sobel gradient — see `SOBEL_NORM`.
 */
const NORMAL_STRENGTH = 1.4;

/**
 * Sobel kernel weight, which the gradient must be divided by to read as a
 * per-texel slope. Without it the raw kernel output spans ±4 for luma in
 * 0..1, so the old `gradient * 2.2` bent the average normal of Lorencia's
 * wood and stone by 30–58° (measured over tile_wood01 / bookshelf / desk_big /
 * c_wall04) and its 95th percentile past 70°. That is not relief — it is a
 * per-texel randomisation of N·L, and it is why Enhanced read as blotchy,
 * smeared and mis-lit next to Classic. MU's art is 128², JPEG-compressed and
 * has its shading painted in, so block ringing and dither become 'geometry'
 * at any real strength. Normalised, the same textures land at 4–10° average
 * and 12–20° at p95 — a surface that catches the torches without fighting the
 * art.
 */
const SOBEL_NORM = 1 / 8;

/**
 * Cap on derived metalness — no environment map, so full metal reads black.
 * The palette heuristic cannot tell gold from warm-lit oak, and every texel
 * it gets wrong costs diffuse and pays it back as a highlight the surface
 * should not have, so the cap stays well under a real metal.
 */
const METAL_MAX = 0.25;
/** Saturation below which a texel may read as metal (1 / this slope). */
const METAL_SAT_SLOPE = 5;
const ROUGH_MIN = 0.45;
const ROUGH_MAX = 0.95;
/** Share of the texture that must be emissive before a map is worth binding. */
const EMISSIVE_MIN_COVERAGE = 0.002;

type Manifest = Record<
  string,
  { normal?: string; metallicRoughness?: string; emissive?: string }
>;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Pure derivation over RGBA8 pixels (row-major, `width` × `height`). */
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

      // Sobel height gradient (wrapping — MU textures tile).
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

      // glTF layout: G roughness, B metalness (R is free — AO, left white).
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

// --- placeholders ----------------------------------------------------------

type Placeholders = {
  normal: RawTexture;
  metallicRoughness: RawTexture;
  black: RawTexture;
};

const placeholders = new WeakMap<Scene, Placeholders>();

/**
 * `nearest` marks the 1×1 placeholders, which have nothing to filter. Every
 * real derived map gets mipmaps and trilinear filtering: it is the same size
 * as the albedo, which *is* mipped, so leaving these unmipped meant a floor
 * seen at a grazing angle sampled full-resolution normal and roughness texels
 * under a minified albedo. That aliases into a crawling, smeared sheen —
 * exactly where Enhanced looked worst next to Classic.
 */
function raw(
  name: string,
  data: Uint8Array,
  width: number,
  height: number,
  scene: Scene,
  nearest: boolean
): RawTexture {
  const texture = new RawTexture(
    data,
    width,
    height,
    Constants.TEXTUREFORMAT_RGBA,
    scene,
    !nearest,
    false,
    nearest
      ? Texture.NEAREST_SAMPLINGMODE
      : Texture.TRILINEAR_SAMPLINGMODE
  );
  texture.name = name;
  texture.gammaSpace = false;
  return texture;
}

/** Flat normal, "rough dielectric", black — what a mesh gets until its maps exist. */
export function pbrPlaceholders(scene: Scene): Placeholders {
  let set = placeholders.get(scene);
  if (set) return set;

  set = {
    normal: raw(
      'pbr_flatNormal',
      new Uint8Array([128, 128, 255, 255]),
      1,
      1,
      scene,
      true
    ),
    metallicRoughness: raw(
      'pbr_flatMR',
      new Uint8Array([255, ROUGH_MAX * 255, 0, 255]),
      1,
      1,
      scene,
      true
    ),
    black: raw('pbr_black', new Uint8Array([0, 0, 0, 255]), 1, 1, scene, true),
  };
  placeholders.set(scene, set);
  return set;
}

// --- per-texture cache -----------------------------------------------------

const maps = new WeakMap<BaseTexture, PbrMapSet | null>();
const pending = new WeakSet<BaseTexture>();

let manifest: Promise<Manifest> | null = null;

function loadManifest(): Promise<Manifest> {
  if (manifest) return manifest;

  manifest = fetch(resolveDataUrl('PBR/manifest.json'))
    .then(r => (r.ok ? (r.json() as Promise<Manifest>) : {}))
    .catch(() => ({}));

  return manifest;
}

/** Source file name of a texture — the GLB label when loaded from one. */
export function textureSourceName(texture: BaseTexture): string {
  const internal = texture.getInternalTexture() as { label?: string } | null;

  return (internal?.label || texture.name).split(/[\\/]/).pop() ?? '';
}

function authored(file: string, scene: Scene): Texture {
  // glTF textures are stored top-down (invertY false); authored maps are
  // painted over the same image, so load them the same way.
  const texture = new Texture(
    resolveDataUrl(`PBR/${file}`),
    scene,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE
  );
  texture.name = `pbr_${file}`;
  texture.gammaSpace = false;
  return texture;
}

async function build(
  texture: BaseTexture,
  scene: Scene
): Promise<PbrMapSet | null> {
  const { width, height } = texture.getSize();
  if (!width || !height) return null;

  const entry = (await loadManifest())[textureSourceName(texture)];

  const needDerived =
    !entry?.normal || !entry.metallicRoughness || !entry.emissive;

  let derived: DerivedMaps | null = null;

  if (needDerived) {
    const pixels = (await texture.readPixels()) as Uint8Array | null;
    if (!pixels) return null;
    derived = derivePbrMaps(pixels, width, height);
  }

  // readPixels hands back the GPU layout; RawTexture with invertY=false
  // uploads it unchanged, so derived maps align with the albedo regardless
  // of how the albedo was flipped on upload.
  const d = (name: string, data: Uint8Array) =>
    raw(
      `${name}_${textureSourceName(texture)}`,
      data,
      width,
      height,
      scene,
      false
    );

  const set: PbrMapSet = {
    normal: entry?.normal
      ? authored(entry.normal, scene)
      : d('pbr_n', derived!.normal),
    metallicRoughness: entry?.metallicRoughness
      ? authored(entry.metallicRoughness, scene)
      : d('pbr_mr', derived!.metallicRoughness),
    emissive: entry?.emissive
      ? authored(entry.emissive, scene)
      : derived!.emissive
        ? d('pbr_e', derived!.emissive)
        : null,
  };

  texture.onDisposeObservable.addOnce(() => {
    set.normal.dispose();
    set.metallicRoughness.dispose();
    set.emissive?.dispose();
    maps.delete(texture);
  });

  return set;
}

/**
 * The map set for a diffuse texture, or null while it is still being built
 * (the build is kicked off on first ask; callers bind the placeholders
 * meanwhile and pick the real set up on a later frame).
 */
export function pbrMapsFor(
  texture: BaseTexture,
  scene: Scene
): PbrMapSet | null {
  const cached = maps.get(texture);
  if (cached !== undefined) return cached;

  if (pending.has(texture) || !texture.isReady()) return null;

  pending.add(texture);

  build(texture, scene)
    .then(set => maps.set(texture, set))
    .catch(error => {
      console.warn(
        `PBR maps for ${textureSourceName(texture)} failed:`,
        error
      );
      maps.set(texture, null);
    })
    .finally(() => pending.delete(texture));

  return null;
}

/** Already-built maps only (no build kick-off) — for the GlowLayer selector. */
export function pbrMapsIfReady(
  texture: BaseTexture | undefined
): PbrMapSet | null {
  return texture ? (maps.get(texture) ?? null) : null;
}
