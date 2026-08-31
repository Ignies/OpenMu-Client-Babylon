/// <reference lib="webworker" />

/**
 * Terrain parsing off the main thread (todo C8).
 *
 * Every parser reachable from here is pure: typed arrays in, typed arrays
 * out, no Babylon and no DOM. That is why `mapFileEncryption` and friends
 * import `common/binaryUtils` rather than `common/utils` — the latter pulls
 * in `Scene`/`Texture` and would drag the whole engine into this chunk.
 *
 * Two request kinds rather than one, because the light bake depends on a
 * JPEG decode that only the engine can do:
 *
 *   'bulk'  — height + attributes + mapping + objects, straight from the
 *             downloaded bytes. This is the part that used to block the
 *             frame on every map change.
 *   'light' — the normal/luminosity pass, once the main thread has decoded
 *             TerrainLight.OZJ into floats.
 */

import { parseTerrainAttribute } from '../../common/terrain/parseTerrainAttribute';
import { parseTerrainHeight } from '../../common/terrain/parseTerrainHeight';
import { parseTerrainMapping } from '../../common/terrain/parseTerrainMapping';
import { parseTerrainObjects } from '../../common/terrain/parseTerrainObjects';
import { parseTerrainLightPacked } from '../../common/terrain/parseTerrainLight';
import type { ENUM_WORLD } from '../../common/types';

export type TerrainWorkerRequest =
  | {
      id: number;
      kind: 'bulk';
      map: ENUM_WORLD;
      heightBytes: Uint8Array;
      attributeBytes: Uint8Array;
      mappingBytes: Uint8Array;
      objectBytes: Uint8Array;
    }
  | {
      id: number;
      kind: 'light';
      lightBuffer: Float32Array;
      heightData: Float32Array;
    };

export type TerrainWorkerBulkResult = {
  height: Float32Array;
  attributes: Uint16Array;
  layer1: Uint8Array;
  layer2: Uint8Array;
  alpha: Uint8Array;
  objects: ReturnType<typeof parseTerrainObjects>;
};

export type TerrainWorkerResponse =
  | { id: number; ok: true; kind: 'bulk'; result: TerrainWorkerBulkResult }
  | { id: number; ok: true; kind: 'light'; result: Float32Array }
  | { id: number; ok: false; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (ev: MessageEvent<TerrainWorkerRequest>) => {
  const req = ev.data;

  try {
    if (req.kind === 'bulk') {
      const height = await parseTerrainHeight(req.heightBytes);
      const attributes = await parseTerrainAttribute(
        req.attributeBytes,
        req.map
      );
      const mapping = await parseTerrainMapping(req.mappingBytes);
      const objects = parseTerrainObjects(req.objectBytes);

      const result: TerrainWorkerBulkResult = {
        height,
        attributes,
        layer1: mapping.layer1,
        layer2: mapping.layer2,
        alpha: mapping.alpha,
        objects,
      };

      // Transfer the buffers rather than copying them: ~850 KB per map change.
      ctx.postMessage({ id: req.id, ok: true, kind: 'bulk', result }, [
        height.buffer,
        attributes.buffer,
        mapping.layer1.buffer,
        mapping.layer2.buffer,
        mapping.alpha.buffer,
      ]);
      return;
    }

    const packed = parseTerrainLightPacked(req.lightBuffer, req.heightData);

    ctx.postMessage({ id: req.id, ok: true, kind: 'light', result: packed }, [
      packed.buffer,
    ]);
  } catch (error) {
    ctx.postMessage({
      id: req.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
