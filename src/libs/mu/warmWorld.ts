import type { World } from '../../ecs/world';
import type { ENUM_WORLD } from '../../common';
import { warmGLTF } from '../../common/modelLoader';
import { isEffectOnlyObject } from '../../common/effectOnlyObjects';
import { decryptMapFile } from '../../common/terrain/mapFileEncryption';
import { assetWorldNum } from '../../common/worldAssets';
import { fetchTerrainFile, terrainFilesFor } from './prefetchWorld';

/** Header of `EncTerrain<n>.obj` (version, map, count) and one record's size. */
const OBJ_HEADER = 4;
const OBJ_RECORD = 30;

/** The object types an `EncTerrain<n>.obj` places, read off its records. */
export function objectTypesIn(encoded: Uint8Array): Set<number> {
  const decoded = new Uint8Array(encoded.length);
  decryptMapFile(decoded, encoded, encoded.length);

  const view = new DataView(decoded.buffer);
  const count = view.getInt16(2, true);
  const types = new Set<number>();

  for (let i = 0; i < count; i++) {
    const at = OBJ_HEADER + i * OBJ_RECORD;
    if (at + 2 > view.byteLength) break;
    types.add(view.getInt16(at, true));
  }

  return types;
}

/**
 * A world's scenery parsed into the model cache without placing any of it, so
 * the warp there later only has the terrain to build. The object list is the
 * same shared download the loader reads (`prefetchWorld.ts`); types with no
 * model of their own - effect-only, or listed in `absent` - are skipped.
 */
export function warmWorldObjects(
  map: ENUM_WORLD,
  world: World,
  absent: readonly number[] = [],
  /** 0..1, as the object list and then each model arrive. */
  onProgress?: (fraction: number) => void
): Promise<void> {
  const file = terrainFilesFor(map).find(f => f.endsWith('.obj'));
  if (!file) return Promise.resolve();

  const dir = `Object${assetWorldNum(map)}/`;

  return fetchTerrainFile(file).then(
    bytes => {
      const files = [...objectTypesIn(bytes)]
        .filter(type => !absent.includes(type) && !isEffectOnlyObject(map, type))
        .map(type => `${dir}Object${(type + 1).toString().padStart(2, '0')}.glb`);
      let done = 0;

      // The object list itself is the first step.
      onProgress?.(1 / (files.length + 1));

      return Promise.all(
        files.map(path =>
          warmGLTF(path, world).then(() => onProgress?.(++done / files.length))
        )
      ).then(() => undefined);
    },
    () => undefined
  );
}
