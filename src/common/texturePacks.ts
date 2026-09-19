import { makeAutoObservable, runInAction } from 'mobx';
import { gameVersion } from '../version';
import { LocalStorage } from '../libs/localStorage';
import type { Texture } from '../libs/babylon/exports';

/**
 * Texture packs: swappable sets of higher-resolution model textures.
 *
 * The models are not duplicated. A pack carries images only, keyed by the
 * name the BMD converter gave each texture (`Object1/ston01`), and the client
 * repoints the live `Texture` objects at them with `updateURL`. That means
 * geometry and animation ship once, a pack costs only the pixels it changes,
 * and switching reaches everything already on screen - the hero and the
 * monsters included - without reloading the map.
 *
 * Packs are discovered, not compiled in: `packs/index.json` lists what the
 * deployment has, so another pack is added by building it and listing it.
 *
 * Two things here are load-bearing and easy to lose:
 *
 *  - `updateURL` REPLACES the internal texture, and the converter's name
 *    lives on it as `label`. After a swap the label reads as the URL that was
 *    just loaded, and `pbrMaps.textureSourceName()` - which decides PBR map
 *    lookups, and via `parseTextureScript` the hide/bright/no-blend rules -
 *    starts reading nonsense. Every swap re-stamps it. (Measured: label
 *    `Object1/bird` came back as the swap URL.)
 *
 *  - Going back to the base texture needs the original bytes, and they only
 *    exist because the glTF loader keeps them on `texture._buffer`. They are
 *    captured before the first swap; without them "Original" could only be
 *    reached by reloading the map.
 */

export type TexturePackInfo = {
  id: string;
  name: string;
  /** How many textures it carries, for the Options row. */
  textures?: number;
  /** Total bytes, so the player can see what selecting it costs. */
  bytes?: number;
};

type PackManifest = {
  /**
   * `<converter texture name>|<source WxH>` -> file path within the pack.
   *
   * The size is part of the key because the name alone is ambiguous: MU ships
   * the same base name as both containers and the model's extension picks
   * between them, so `Object1/tree_01` is a 32x32 cut-out for the planter
   * bushes and a 128x64 opaque image for something else. 56 names collide
   * that way, every one mixing an alpha container with an opaque one.
   */
  textures: Record<string, string>;
};

const ACTIVE_KEY = 'mu_texture_pack';
/** The id that means "the textures baked into the models". */
export const ORIGINAL_PACK = '';

const withTrailingSlash = (s: string) => (s.endsWith('/') ? s : `${s}/`);

/**
 * Packs sit beside the version's converted assets, so each game version has
 * its own set: `./game-assets/` pairs with `./packs/`, and v097d's
 * `./game-assets-v097d/` with `./packs-v097d/`. A fixed folder would offer
 * season 6 textures to a v097d client.
 */
export function packsBase(): string {
  const override = import.meta.env.VITE_TEXTURE_PACKS_URL;
  if (override) return withTrailingSlash(override);
  // Read at call time: this module is imported before the version handle is
  // assigned.
  const assets = gameVersion.data.assets.replace(/\/+$/, '');
  return `${assets.replace(/game-assets/, 'packs')}/`;
}

class TexturePackStore {
  available: TexturePackInfo[] = [];
  activeId: string = LocalStorage.load(ACTIVE_KEY) ?? ORIGINAL_PACK;
  /** False until the pack's own manifest has arrived. */
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  get active(): TexturePackInfo | null {
    return this.available.find(p => p.id === this.activeId) ?? null;
  }
}

export const texturePacks = new TexturePackStore();

let indexPending: Promise<TexturePackInfo[]> | null = null;

/** The packs this deployment ships. Empty when none are installed. */
export function loadPackIndex(): Promise<TexturePackInfo[]> {
  indexPending ??= (async () => {
    try {
      const res = await fetch(`${packsBase()}index.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const packs: TexturePackInfo[] = (await res.json()).packs ?? [];
      runInAction(() => {
        texturePacks.available = packs;
        // A pack that was selected and has since been removed must not leave
        // the client asking for files that are not there.
        if (texturePacks.activeId && !packs.some(p => p.id === texturePacks.activeId)) {
          texturePacks.activeId = ORIGINAL_PACK;
        }
      });
      return packs;
    } catch {
      // No packs installed is the normal case, not an error worth shouting
      // about: the option simply offers Original only.
      runInAction(() => {
        texturePacks.available = [];
        texturePacks.activeId = ORIGINAL_PACK;
      });
      return [];
    }
  })();
  return indexPending;
}

const manifests = new Map<string, Promise<PackManifest>>();

function manifestFor(id: string): Promise<PackManifest> {
  let m = manifests.get(id);
  if (!m) {
    m = (async () => {
      try {
        const res = await fetch(`${packsBase()}${id}/pack.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as PackManifest;
      } catch (e) {
        console.warn(
          `[texturePacks] pack "${id}" has no readable manifest (${(e as Error).message}); using the original textures`
        );
        return { textures: {} };
      }
    })();
    manifests.set(id, m);
  }
  return m;
}

/** Lower-cased label -> URL, for the active pack. Empty when none is active. */
let activeUrls = new Map<string, string>();
let activeFor = ORIGINAL_PACK;

async function ensureActiveManifest(): Promise<void> {
  const id = texturePacks.activeId;
  if (activeFor === id) return;
  if (!id) {
    activeUrls = new Map();
    activeFor = id;
    return;
  }
  const manifest = await manifestFor(id);
  const map = new Map<string, string>();
  for (const [label, file] of Object.entries(manifest.textures ?? {})) {
    map.set(label.toLowerCase(), `${packsBase()}${id}/${file}`);
  }
  activeUrls = map;
  activeFor = id;
}

/** The converter's name for a texture, as Babylon kept it. */
export function textureLabel(texture: Texture): string | null {
  const internal = texture.getInternalTexture() as { label?: string } | null;
  const label = internal?.label;
  // After a swap the label is whatever URL was loaded; the original is the
  // one remembered below.
  const remembered = originals.get(texture);
  return remembered?.label ?? (label && !label.includes('://') ? label : null);
}

type Original = {
  url: string;
  buffer: unknown;
  label: string;
  /** The size before anything was swapped in - half of the pack key. */
  width: number;
  height: number;
  /**
   * Whether the model's own texture had an alpha channel. A pack must never
   * change this: the material is chosen from it, and a cut-out whose
   * replacement arrived opaque is re-resolved as a solid, single-sided card -
   * which is a bed of flowers drawing as grey slabs.
   */
  hasAlpha: boolean;
};
const originals = new WeakMap<Texture, Original>();

function remember(texture: Texture): Original | null {
  const existing = originals.get(texture);
  if (existing) return existing;

  const internal = texture.getInternalTexture() as { label?: string } | null;
  const label = internal?.label;
  if (!label) return null;

  const size = texture.getSize();
  const entry: Original = {
    url: texture.url ?? '',
    buffer: (texture as unknown as { _buffer?: unknown })._buffer,
    label,
    width: size.width,
    height: size.height,
    hasAlpha: texture.hasAlpha,
  };
  originals.set(texture, entry);
  return entry;
}

function reload(texture: Texture, url: string, buffer: unknown, original: Original) {
  return new Promise<void>(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Put the converter's name back: updateURL replaced the internal
      // texture and with it the label everything else reads.
      const internal = texture.getInternalTexture() as { label?: string } | null;
      if (internal) internal.label = original.label;
      // And the alpha flag, which the replacement image must not get a vote on.
      texture.hasAlpha = original.hasAlpha;
      resolve();
    };
    try {
      (texture as unknown as {
        updateURL: (u: string, b: unknown, cb: () => void) => void;
      }).updateURL(url, buffer ?? null, finish);
    } catch {
      finish();
      return;
    }
    // updateURL's callback does not fire on a failed load.
    setTimeout(finish, 15000);
  });
}

/**
 * Point one texture at the active pack, or back at the bytes it was parsed
 * from. Safe to call repeatedly: it does nothing when the texture is already
 * showing the right image.
 */
export async function applyPackToTexture(texture: Texture): Promise<void> {
  const original = remember(texture);
  if (!original) return;

  await ensureActiveManifest();

  const key = `${original.label}|${original.width}x${original.height}`.toLowerCase();
  const wanted = activeUrls.get(key) ?? null;
  const showing = shown.get(texture) ?? null;
  if (wanted === showing) return;

  if (wanted) await reload(texture, wanted, null, original);
  else await reload(texture, original.url, original.buffer, original);

  shown.set(texture, wanted);
}

/** What each texture is currently displaying: a pack URL, or null for original. */
const shown = new WeakMap<Texture, string | null>();

export async function setActivePack(id: string): Promise<void> {
  if (texturePacks.activeId === id) return;
  runInAction(() => {
    texturePacks.activeId = id;
    texturePacks.loading = true;
  });
  LocalStorage.save(ACTIVE_KEY, id);
  try {
    await ensureActiveManifest();
    for (const listener of listeners) await listener();
  } finally {
    runInAction(() => {
      texturePacks.loading = false;
    });
  }
}

type Listener = () => void | Promise<void>;
const listeners = new Set<Listener>();

/** Called when the selection changes, so the loader can restyle what is live. */
export function onTexturePackChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
