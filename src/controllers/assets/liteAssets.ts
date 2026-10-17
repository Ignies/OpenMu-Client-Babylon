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
