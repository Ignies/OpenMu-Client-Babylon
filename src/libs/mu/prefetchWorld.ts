import { ENUM_WORLD } from '../../common';
import { downloadDataBytesBuffer } from '../../common/utils';
import { getTilesList } from '../../common/terrain/getTilesList';
import { assetWorldNum } from '../../common/worldAssets';

/**
 * One in-memory promise per terrain file URL, shared by `prefetchWorldTerrain`
 * and `getTerrainData`: a prefetch started on the gate trigger / warp request
 * is the very same promise the loader later awaits, so the download is never
 * paid twice. Entries are consumed (deleted) by the loader, which keeps the
 * map bounded to whatever was prefetched but never loaded.
 */
const pending = new Map<string, Promise<Uint8Array>>();

/** Fetch a `Data/` file through the shared cache (`World4/EncTerrain4.att`). */
export function fetchTerrainFile(url: string): Promise<Uint8Array> {
  let p = pending.get(url);
  if (!p) {
    p = downloadDataBytesBuffer(url);
    p.catch(() => pending.delete(url));
    pending.set(url, p);
  }
  return p;
}

/** Same as `fetchTerrainFile`, but the entry leaves the cache with the caller. */
export function consumeTerrainFile(url: string): Promise<Uint8Array> {
  const p = fetchTerrainFile(url);
  pending.delete(url);
  return p;
}

/** The five terrain files and the tile textures of one world, in load order. */
export function terrainFilesFor(map: ENUM_WORLD): string[] {
  const worldNum = assetWorldNum(map);
  const folder = `World${worldNum}/`;

  return [
    `${folder}EncTerrain${worldNum}.att`,
    `${folder}TerrainHeight.OZB`,
    `${folder}EncTerrain${worldNum}.map`,
    `${folder}TerrainLight.OZJ`,
    `${folder}EncTerrain${worldNum}.obj`,
    ...getTilesList(map).map(tile => `${folder}${tile}.OZJ`),
  ];
}

export function prefetchWorldTerrain(map: ENUM_WORLD): void {
  for (const file of terrainFilesFor(map)) {
    fetchTerrainFile(file).catch(() => {});
  }
}
