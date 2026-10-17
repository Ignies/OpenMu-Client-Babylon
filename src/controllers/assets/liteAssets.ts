/**
 * Ours: the lighter copies a build may write beside the originals (`tools/liteAssets.ts`): WebP
 * textures and item icons, Ogg Opus music. The originals always stay. A read takes the copy only
 * when the world allows it, the player did not turn it off, and the assets index lists it. See
 * assets/readme.md.
 */

const MUSIC = /(^|\/)Music\/[^/]+$/i;
const ITEMS = /(^|\/)items\/[^/]+$/i;

/** The lighter copy's path for an asset path, or null when it never has one. */
export function liteVariantOf(path: string): string | null {
  if (/\.oz[jt]$/i.test(path)) return `${path}.webp`;
  if (ITEMS.test(path) && /\.png$/i.test(path)) return `${path.slice(0, -4)}.webp`;
  if (MUSIC.test(path) && /\.ogg$/i.test(path) && !/\.opus\.ogg$/i.test(path)) return `${path.slice(0, -4)}.opus.ogg`;
  return null;
}

/** The original a lighter copy stands for, or null when the path is not one. */
export function liteSourceOf(path: string): string | null {
  if (/\.oz[jt]\.webp$/i.test(path)) return path.slice(0, -5);
  if (ITEMS.test(path) && /\.webp$/i.test(path)) return `${path.slice(0, -5)}.png`;
  if (MUSIC.test(path) && /\.opus\.ogg$/i.test(path)) return `${path.slice(0, -9)}.ogg`;
  return null;
}

/** `./Data/x`, `/Data/x` and `Data/x` are one file. */
const key = (url: string) => url.split(/[?#]/, 1)[0].replace(/^\.?\/+/, '');

/** The copies this deployment ships, from the assets index; null until it is read. */
let listed: Set<string> | null = null;
/** Copies that failed to load once: the original is read instead for the rest of the session. */
const failed = new Set<string>();
let gate: () => boolean = () => false;
let loadIndex: (() => void) | null = null;

/** The copies the assets index lists (`Group.lite`), by url. */
export function setLiteVariants(urls: Iterable<string>): void {
  listed = new Set([...urls].map(key));
}

/** Whether copies are wanted now: the world's `liteAssets` and the player's improvement (`servers` module). */
export function setLiteAssetsGate(fn: () => boolean): void {
  gate = fn;
}

/** Whether the world and the player want copies, listed or not (the download screen's total). */
export function liteWanted(): boolean {
  return gate();
}

/** Asked once, the first time a copy is wanted before the index is read (`assetDownload.ts`). */
export function setLiteIndexLoader(fn: () => void): void {
  loadIndex = fn;
}

/** The copy to read instead of `url`, or null for the original. */
export function liteUrl(url: string): string | null {
  if (!gate()) return null;
  if (!listed) {
    loadIndex?.();
    loadIndex = null;
    return null;
  }
  const variant = liteVariantOf(url.split(/[?#]/, 1)[0]);
  return variant && listed.has(key(variant)) && !failed.has(key(variant)) ? variant : null;
}

/** A copy that did not load: its original from now on. */
export function liteFailed(variant: string): void {
  failed.add(key(variant));
}

/** Tests only. */
export function resetLiteAssets(): void {
  listed = null;
  loadIndex = null;
  failed.clear();
  gate = () => false;
}
