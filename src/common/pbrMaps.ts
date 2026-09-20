import {
  Constants,
  RawTexture,
  Texture,
  type BaseTexture,
  type Scene,
} from '../libs/babylon/exports';
import { resolveDataUrl } from '../libs/mu/dataFolder';
import { FILTER_ANISOTROPY } from './materialQuality';
import { derivePbrMaps, flipRows, ROUGH_MAX, type DerivedMaps } from './pbrDerive';
import type { PbrWorkerRequest, PbrWorkerResponse } from './pbrMaps.worker';

/**
 * PBR map sets for the Enhanced material ("authored maps").
 *
 * MU's art is diffuse-only, so the maps are derived from it (`pbrDerive.ts`).
 * Hand-authored maps win over the derivation: `Data/PBR/manifest.json` maps a
 * texture's source name to files under `Data/PBR/`. Missing manifest = all
 * derived; missing entry = derived for that texture.
 *
 * The derivation reads the texture's *own bytes* - the encoded image the
 * glTF loader (and a texture pack swap) leaves on `texture._buffer`, or the
 * file behind `texture.url` - decoded with `createImageBitmap` in a worker.
 * It used to read the pixels back from the GPU, and Babylon's readback is a
 * synchronous flush of everything queued: the frame stopped for as long as
 * the GPU took to drain, from inside a material bind, the first time each
 * new texture came on screen. Online that is every player and monster that
 * walks into view, so the game hitched every few seconds for as long as it
 * ran - 1 ms a time on an RTX 5070, up to 450 ms on an integrated Radeon.
 * The readback is kept only as the last fallback, for a texture whose bytes
 * cannot be found or decoded.
 */

export type PbrMapSet = {
  normal: BaseTexture;
  metallicRoughness: BaseTexture;
  /** Null when the derivation found nothing worth glowing. */
  emissive: BaseTexture | null;
};

type Manifest = Record<
  string,
  { normal?: string; metallicRoughness?: string; emissive?: string }
>;

// --- placeholders ----------------------------------------------------------

type Placeholders = {
  normal: RawTexture;
  metallicRoughness: RawTexture;
  black: RawTexture;
};

const placeholders = new WeakMap<Scene, Placeholders>();

/**
 * `nearest` marks the 1x1 placeholders, which have nothing to filter. Every
 * real derived map gets mipmaps, trilinear filtering and the albedo's
 * anisotropy: it is the same size as the albedo, which *is* mipped, so
 * leaving these unmipped meant a floor seen at a grazing angle sampled
 * full-resolution normal and roughness texels under a minified albedo. That
 * aliases into a crawling, smeared sheen. The maps are only ever bound on the
 * PBR variant, which is a tier >= 1 material, so they take no Classic mode.
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
  texture.anisotropicFilteringLevel = nearest ? 1 : FILTER_ANISOTROPY;
  return texture;
}

/** Flat normal, "rough dielectric", black - what a mesh gets until its maps exist. */
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

// --- source pixels ---------------------------------------------------------

type Derived = DerivedMaps & { width: number; height: number };

/**
 * The encoded image a texture was made from. The glTF loader hands its
 * bytes to `updateURL` and Babylon keeps them as `_buffer` (that is also
 * what `texturePacks.ts` restores "Original" from); a pack swap by URL
 * leaves the file address instead. The loader's `url` is a fake
 * `data:<root><name>` label, not a data URI, so it is never fetched.
 */
async function sourceBytes(texture: BaseTexture): Promise<ArrayBuffer | null> {
  const buffer = (texture as unknown as { _buffer?: unknown })._buffer;

  if (buffer instanceof ArrayBuffer) return buffer.slice(0);
  if (ArrayBuffer.isView(buffer)) {
    return (buffer.buffer as ArrayBuffer).slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }
  if (buffer instanceof Blob) return buffer.arrayBuffer();

  const url = (texture as { url?: string | null }).url;
  if (!url || url.startsWith('data:')) return null;

  const response = await fetch(url);
  return response.ok ? response.arrayBuffer() : null;
}

let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<
  number,
  { resolve: (value: Derived) => void; reject: (reason: unknown) => void }
>();

function pbrWorker(): Worker | null {
  if (worker !== undefined) return worker;

  try {
    worker = new Worker(new URL('./pbrMaps.worker.ts', import.meta.url), {
      type: 'module',
      name: 'pbr-maps',
    });

    worker.onmessage = (event: MessageEvent<PbrWorkerResponse>) => {
      const message = event.data;
      const entry = waiting.get(message.id);
      if (!entry) return;
      waiting.delete(message.id);

      if (message.ok) entry.resolve(message);
      else entry.reject(new Error(message.error));
    };

    worker.onerror = event => {
      console.warn('PBR map worker failed, deriving inline instead:', event);
      for (const [, entry] of waiting) entry.reject(new Error('pbr worker error'));
      waiting.clear();
      worker?.terminate();
      worker = null;
    };
  } catch (error) {
    console.warn('PBR map worker unavailable, deriving inline instead:', error);
    worker = null;
  }

  return worker;
}

/** A texture's image, as encoded bytes or as the pixels of the canvas it was drawn on. */
type Source =
  | { bytes: ArrayBuffer }
  | { pixels: Uint8ClampedArray; width: number; height: number };

/**
 * A canvas-drawn texture (the signpost plates) has no file behind it; its
 * pixels are on the 2D canvas Babylon uploaded from, read without the GPU.
 */
function canvasPixels(texture: BaseTexture): Source | null {
  if (texture.getClassName() !== 'DynamicTexture') return null;

  const context = (
    texture as { getContext?: () => CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D }
  ).getContext?.();
  const { width, height } = texture.getSize();
  if (!context || !width || !height) return null;

  return { pixels: context.getImageData(0, 0, width, height).data, width, height };
}

async function source(texture: BaseTexture): Promise<Source | null> {
  const drawn = canvasPixels(texture);
  if (drawn) return drawn;

  const bytes = await sourceBytes(texture);
  return bytes ? { bytes } : null;
}

function deriveInWorker(src: Source, flipY: boolean): Promise<Derived> | null {
  const w = pbrWorker();
  if (!w) return null;

  const id = nextId++;
  const request: PbrWorkerRequest = { id, flipY, ...src };
  const transfer = 'bytes' in src ? [src.bytes] : [src.pixels.buffer];

  return new Promise<Derived>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    w.postMessage(request, transfer);
  });
}

/** Main-thread decode, for a browser without module workers: still no GPU flush. */
async function deriveInline(src: Source, flipY: boolean): Promise<Derived> {
  let data: Uint8ClampedArray;
  let width: number;
  let height: number;

  if ('bytes' in src) {
    const bitmap = await createImageBitmap(new Blob([src.bytes]));
    ({ width, height } = bitmap);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      bitmap.close();
      throw new Error('no 2d context');
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    data = context.getImageData(0, 0, width, height).data;
  } else {
    ({ pixels: data, width, height } = src);
  }

  if (flipY) flipRows(data, width, height);

  return { width, height, ...derivePbrMaps(data, width, height) };
}

/**
 * The maps for a texture from its source image; null when the bytes are
 * not to be had. `invertY` textures are flipped on upload, and the maps
 * are uploaded unflipped, so they are derived in the GPU's row order.
 */
async function deriveFromSource(texture: BaseTexture): Promise<Derived | null> {
  const src = await source(texture);
  if (!src) return null;

  const flipY = (texture as { invertY?: boolean }).invertY === true;

  try {
    const inWorker = deriveInWorker(src, flipY);
    if (inWorker) return await inWorker;
  } catch (error) {
    console.warn(
      `PBR map worker failed for ${textureSourceName(texture)}, deriving inline:`,
      error
    );
  }

  // The worker path transferred the source away; take it again.
  const again = await source(texture);
  return again ? deriveInline(again, flipY) : null;
}

/** Last resort: the GPU readback, a synchronous flush of the whole queue. */
async function deriveFromGpu(texture: BaseTexture): Promise<Derived | null> {
  const { width, height } = texture.getSize();
  if (!width || !height) return null;

  const pixels = (await texture.readPixels()) as Uint8Array | null;
  if (!pixels) return null;

  return { width, height, ...derivePbrMaps(pixels, width, height) };
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

/** Source file name of a texture - the GLB label when loaded from one. */
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
  texture.anisotropicFilteringLevel = FILTER_ANISOTROPY;
  return texture;
}

async function build(
  texture: BaseTexture,
  scene: Scene
): Promise<PbrMapSet | null> {
  const entry = (await loadManifest())[textureSourceName(texture)];

  const needDerived =
    !entry?.normal || !entry.metallicRoughness || !entry.emissive;

  let derived: Derived | null = null;

  if (needDerived) {
    derived = (await deriveFromSource(texture)) ?? (await deriveFromGpu(texture));
    if (!derived) return null;
  }

  // The maps are in the GPU's row order; RawTexture with invertY=false
  // uploads them unchanged, so they align with the albedo however it was
  // flipped on upload.
  const d = (name: string, data: Uint8Array) =>
    raw(
      `${name}_${textureSourceName(texture)}`,
      data,
      derived!.width,
      derived!.height,
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

/** Already-built maps only (no build kick-off) - for the GlowLayer selector. */
export function pbrMapsIfReady(
  texture: BaseTexture | undefined
): PbrMapSet | null {
  return texture ? (maps.get(texture) ?? null) : null;
}
