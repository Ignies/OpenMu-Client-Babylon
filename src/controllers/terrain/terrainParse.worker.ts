/// <reference lib="webworker" />

/**
 * Terrain parsing off the main thread: 'bulk', 'lightJpeg', 'light', 'ground' and 'pack' requests
 * (see readme.md). Everything reachable from here stays free of Babylon and the DOM.
 */

import { parseTerrainAttribute } from './parseTerrainAttribute';
import { parseTerrainHeight } from './parseTerrainHeight';
import { parseTerrainMapping } from './parseTerrainMapping';
import { parseTerrainObjects } from './parseTerrainObjects';
import { parseTerrainLightPacked } from './parseTerrainLight';
import type { ENUM_WORLD } from '../../core/types';
import {
  buildGroundArrays,
  type GroundArrays,
} from './groundArrays';
import { packLayers, type TilePixels } from './tilePack';
import {
  LIGHT_JPEG_DECODE,
  decodeJpegPixels,
  lightFromPixels,
} from './terrainJpeg';

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
      kind: 'lightJpeg';
      jpeg: Uint8Array;
      heightData: Float32Array;
      liftBorder: boolean;
    }
  | {
      id: number;
      kind: 'light';
      lightBuffer: Float32Array;
      heightData: Float32Array;
      liftBorder: boolean;
    }
  | {
      id: number;
      kind: 'ground';
      height: Float32Array;
      attributes: Uint16Array;
      layer1: Uint8Array;
      layer2: Uint8Array;
      alpha: Uint8Array;
      lightPacked: Float32Array;
      ambient: number;
    }
  | {
      id: number;
      kind: 'pack';
      tiles: TilePixels[];
      size: number;
      linear: boolean;
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
  | { id: number; ok: true; kind: 'lightJpeg'; result: Float32Array }
  | { id: number; ok: true; kind: 'light'; result: Float32Array }
  | { id: number; ok: true; kind: 'ground'; result: GroundArrays }
  | { id: number; ok: true; kind: 'pack'; result: Uint8Array }
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

    if (req.kind === 'ground') {
      const ground = buildGroundArrays(
        req.height,
        req.attributes,
        req.layer1,
        req.layer2,
        req.alpha,
        req.lightPacked,
        req.ambient
      );

      ctx.postMessage({ id: req.id, ok: true, kind: 'ground', result: ground }, [
        ground.positions.buffer,
        ground.normals.buffer,
        ground.uvs.buffer,
        ground.textures.buffer,
        ground.colors.buffer,
        ground.alphaColors.buffer,
        ground.indices.buffer,
      ]);
      return;
    }

    if (req.kind === 'pack') {
      const layers = packLayers(req.tiles, req.size, req.linear);

      ctx.postMessage({ id: req.id, ok: true, kind: 'pack', result: layers }, [
        layers.buffer,
      ]);
      return;
    }

    const lightBuffer =
      req.kind === 'lightJpeg'
        ? lightFromPixels(await decodeJpegPixels(req.jpeg, LIGHT_JPEG_DECODE))
        : req.lightBuffer;

    const packed = parseTerrainLightPacked(
      lightBuffer,
      req.heightData,
      req.liftBorder
    );

    ctx.postMessage({ id: req.id, ok: true, kind: req.kind, result: packed }, [
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
