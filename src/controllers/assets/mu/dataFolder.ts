import { downloadBytesBuffer } from '../download';
import { gameVersion } from '@/version';
import type { VersionData } from '@/version/contract';

const relative = (path: string) => path.replace(/^[./]+/, '');

/** The tree lending a path the version's own tree lacks (`borrows.folderPaths`), or null. */
function lender(data: VersionData, path: string): string | null {
  const key = relative(path).toLowerCase();
  const { inventory, borrows } = data;

  if (!inventory || inventory.has(key) || !borrows?.folder) return null;

  return borrows.folderPaths?.some(prefix => key.startsWith(prefix)) ? borrows.folder : null;
}

/**
 * The *original* `Data/` tree (sprites, effect textures, Local
 * tables, gate.bmd). Kept separate from `resolveUrlToDataFolder`, which points
 * at the converted `public/game-assets`.
 *
 * `vite dev` serves the `client/Data` junction at `/Data/` with no config, so
 * the default `./Data/` works there. For a production build the subset the
 * client actually fetches is copied into `dist/Data` by
 * [tools/copyData.ts](../../../../tools/copyData.ts) (run from `bun run build`),
 * so the same default works from `dist/`. A deployment that hosts the data
 * elsewhere (CDN, another origin) sets `VITE_DATA_URL` at build time; a
 * trailing slash is added if missing. Both are decided by the selected game
 * version (`versions/<id>/data`), since each version has its own tree.
 *
 * `dataUrl` is where a path is read from: the version's own tree, or the one
 * lending it (`borrows.folderPaths`).
 */
export function dataUrl(data: VersionData, path: string): string {
  return (lender(data, path) ?? data.folder) + relative(path);
}

/**
 * Can the version read this path at all? A version that declares no
 * inventory (Season 6) answers yes to everything; a period tree answers yes
 * for what it ships or borrows, and no for the Season 6 files it never
 * shipped, so its loaders draw nothing instead of fetching a 404 per frame
 * (`versions/<id>/data/inventory.ts`).
 */
export function hasData(data: VersionData, path: string): boolean {
  const inventory = data.inventory;

  return !inventory || inventory.has(relative(path).toLowerCase()) || lender(data, path) !== null;
}

export function resolveDataUrl(path: string): string {
  return dataUrl(gameVersion.data, path);
}

export function downloadDataFile(path: string): Promise<Uint8Array> {
  return downloadBytesBuffer(resolveDataUrl(path));
}

/** `hasData` for the active version. */
export function hasDataFile(path: string): boolean {
  return hasData(gameVersion.data, path);
}
