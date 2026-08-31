/**
 * Main-thread half of the terrain parsing worker (todo C8).
 *
 * One worker, created lazily on the first map load and kept for the session
 * (map changes reuse it). If the worker cannot be constructed — no module
 * worker support, a bundler quirk, a CSP — every call falls back to running
 * the same parsers inline, which is exactly the old behaviour, so this can
 * only ever cost the stutter it was meant to remove.
 */

import { parseTerrainAttribute } from '../../common/terrain/parseTerrainAttribute';
import { parseTerrainHeight } from '../../common/terrain/parseTerrainHeight';
import { parseTerrainMapping } from '../../common/terrain/parseTerrainMapping';
import { parseTerrainObjects } from '../../common/terrain/parseTerrainObjects';
import { parseTerrainLightPacked } from '../../common/terrain/parseTerrainLight';
import type { ENUM_WORLD } from '../../common/types';
import type {
  TerrainWorkerBulkResult,
  TerrainWorkerRequest,
  TerrainWorkerResponse,
} from './terrainParse.worker';

/**
 * Escape hatch, in the style of `USE_TILE_TEXTURE_ARRAY`: set to false to
 * parse everything on the main thread exactly as before the worker landed.
 * The two paths call the same functions with the same inputs, so this only
 * changes *where* the work runs.
 */
const USE_TERRAIN_WORKER = true;

let worker: Worker | null | undefined;
let nextId = 1;

const pending = new Map<
  number,
  { resolve: (value: any) => void; reject: (reason: unknown) => void }
>();

function getWorker(): Worker | null {
  if (!USE_TERRAIN_WORKER) return null;
  if (worker !== undefined) return worker;

  try {
    worker = new Worker(new URL('./terrainParse.worker.ts', import.meta.url), {
      type: 'module',
      name: 'terrain-parse',
    });

    worker.onmessage = (ev: MessageEvent<TerrainWorkerResponse>) => {
      const msg = ev.data;
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);

      if (msg.ok) entry.resolve(msg.result);
      else entry.reject(new Error(msg.error));
    };

    worker.onerror = event => {
      console.warn('Terrain worker failed, parsing inline instead:', event);
      // Fail every outstanding call so the caller's fallback runs; drop the
      // worker so later map loads go straight to the inline path.
      for (const [, entry] of pending) {
        entry.reject(new Error('terrain worker error'));
      }
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch (error) {
    console.warn('Terrain worker unavailable, parsing inline instead:', error);
    worker = null;
  }

  return worker;
}

/**
 * Inputs are structured-cloned, never transferred. Transferring them would
 * be ~1.2 MB cheaper per map change, but it detaches the caller's buffers —
 * and the worker can still fail *after* the post (onerror mid-flight), at
 * which point the inline fallback would be handed detached arrays and throw.
 * A one-off clone of ~1.2 MB is not worth trading a working fallback for.
 * Results travel the other way transferred, where no fallback is at stake.
 */
function post<T>(req: TerrainWorkerRequest): Promise<T> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error('no terrain worker'));

  return new Promise<T>((resolve, reject) => {
    pending.set(req.id, { resolve, reject });
    w.postMessage(req);
  });
}

/** The inline equivalent of a 'bulk' request, used when the worker is out. */
async function bulkInline(
  map: ENUM_WORLD,
  heightBytes: Uint8Array,
  attributeBytes: Uint8Array,
  mappingBytes: Uint8Array,
  objectBytes: Uint8Array
): Promise<TerrainWorkerBulkResult> {
  const height = await parseTerrainHeight(heightBytes);
  const attributes = await parseTerrainAttribute(attributeBytes, map);
  const mapping = await parseTerrainMapping(mappingBytes);

  return {
    height,
    attributes,
    layer1: mapping.layer1,
    layer2: mapping.layer2,
    alpha: mapping.alpha,
    objects: parseTerrainObjects(objectBytes),
  };
}

/**
 * Height, attributes, tile mapping and the object list in one round trip.
 *
 * The four byte arrays are cloned into the worker, so the caller keeps
 * ownership of them.
 */
export async function parseTerrainBulk(
  map: ENUM_WORLD,
  heightBytes: Uint8Array,
  attributeBytes: Uint8Array,
  mappingBytes: Uint8Array,
  objectBytes: Uint8Array
): Promise<TerrainWorkerBulkResult> {
  try {
    return await post<TerrainWorkerBulkResult>({
      id: nextId++,
      kind: 'bulk',
      map,
      heightBytes,
      attributeBytes,
      mappingBytes,
      objectBytes,
    });
  } catch (error) {
    console.warn('Terrain bulk parse fell back to the main thread:', error);
    return bulkInline(
      map,
      heightBytes,
      attributeBytes,
      mappingBytes,
      objectBytes
    );
  }
}

/**
 * The baked light pass. Both inputs are cloned; the caller keeps using
 * `heightData` for the ground mesh and the height map.
 */
export async function parseTerrainLightOffThread(
  lightBuffer: Float32Array,
  heightData: Float32Array
): Promise<Float32Array> {
  try {
    return await post<Float32Array>({
      id: nextId++,
      kind: 'light',
      lightBuffer,
      heightData,
    });
  } catch (error) {
    console.warn('Terrain light parse fell back to the main thread:', error);
    return parseTerrainLightPacked(lightBuffer, heightData);
  }
}
