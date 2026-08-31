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
