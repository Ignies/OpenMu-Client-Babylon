import { downloadBytesBuffer } from '../../common/utils';
import { gameVersion } from '../../version';

/**
 * Base URL of the *original* `Data/` tree (sprites, effect textures, Local
 * tables, gate.bmd). Kept separate from `resolveUrlToDataFolder`, which points
 * at the converted `public/game-assets`.
 *
 * `vite dev` serves the `client/Data` junction at `/Data/` with no config, so
 * the default `./Data/` works there. For a production build the subset the
 * client actually fetches is copied into `dist/Data` by
 * [tools/copyData.ts](../../../tools/copyData.ts) (run from `bun run build`),
 * so the same default works from `dist/`. A deployment that hosts the data
 * elsewhere (CDN, another origin) sets `VITE_DATA_URL` at build time; a
 * trailing slash is added if missing. Both are decided by the selected game
 * version (`versions/<id>/data`), since each version has its own tree.
 */
export const DATA_FOLDER = gameVersion.data.folder;

export function resolveDataUrl(path: string): string {
  return DATA_FOLDER + path.replace(/^[./]+/, '');
}

export function downloadDataFile(path: string): Promise<Uint8Array> {
  return downloadBytesBuffer(resolveDataUrl(path));
}

/**
 * Does the active version's `Data/` tree contain this path? A version that
 * declares no inventory (Season 6) answers yes to everything, so nothing
 * about it changes; a period tree answers no for the Season 6 chrome and the
 * post-0.97 effect textures it never shipped, and its loaders draw nothing
 * instead of fetching a 404 per frame (`versions/<id>/data/inventory.ts`).
 */
export function hasDataFile(path: string): boolean {
  const inventory = gameVersion.data.inventory;

  if (!inventory) return true;

  return inventory.has(path.replace(/^[./]+/, '').toLowerCase());
}
