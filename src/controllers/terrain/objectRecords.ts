import type { IVector3Like } from '../render/babylon/exports';

/** One object record of `EncTerrain<n>.obj` (`parseTerrainObjects`). */
export type MapObjectRecord = {
  id: number;
  pos: IVector3Like;
  rot: IVector3Like;
  scale: number;
};

/** MU units per object block: `16 * TERRAIN_SCALE`. */
const BLOCK = 1600;

/**
 * Whether a record becomes an object. `CreateObject` drops a record outside the 16x16 block grid
 * (ZzzObject.cpp:4439-4441); NaN coordinates pass that test, so they are dropped too. A negative
 * type is kept by the original but never had a model loaded (`Models[Type]`), so it draws nothing:
 * World7 places one (-515), and skipping it spares a fetch of a model that does not exist.
 */
export function placesObject(record: Pick<MapObjectRecord, 'id' | 'pos'>): boolean {
  const blockX = Math.floor(record.pos.x / BLOCK);
  const blockY = Math.floor(record.pos.y / BLOCK);
  if (!Number.isFinite(blockX) || !Number.isFinite(blockY)) return false;
  if (blockX < 0 || blockX >= 16 || blockY < 0 || blockY >= 16) return false;
  return record.id >= 0;
}
