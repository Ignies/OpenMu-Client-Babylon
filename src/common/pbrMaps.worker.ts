/// <reference lib="webworker" />

/**
 * PBR map derivation off the main thread: the texture's own encoded bytes
 * come in, the three maps go out. The decode is `createImageBitmap`, or the
 * Basis transcoder for a KTX2 pack file; both work in a worker, so nothing
 * here touches the GPU - see `pbrMaps.ts` for why that matters.
 */

import { derivePbrMaps, flipRows } from './pbrDerive';
import { decodeKtx2, isKtx2, loadTranscoder, type TranscoderUrls } from './ktx2Pixels';

export type PbrWorkerRequest = {
  id: number;
  /** Derive from the rows bottom-up, the GPU's order for an `invertY` upload. */
  flipY: boolean;
} & (
  /** `transcoder` is needed only when the bytes are a KTX2 pack file. */
  | { bytes: ArrayBuffer; transcoder?: TranscoderUrls }
  /** Already decoded RGBA8, top row first (a canvas-drawn texture). */
  | { pixels: Uint8ClampedArray; width: number; height: number }
);

export type PbrWorkerResponse =
  | {
      id: number;
      ok: true;
      width: number;
      height: number;
      normal: Uint8Array;
      metallicRoughness: Uint8Array;
      emissive: Uint8Array | null;
    }
  | { id: number; ok: false; error: string };

async function decode(
  bytes: ArrayBuffer,
  transcoder?: TranscoderUrls
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  if (isKtx2(bytes)) {
    if (!transcoder) throw new Error('KTX2 source without a transcoder');
    return decodeKtx2(bytes, await loadTranscoder(transcoder));
  }

  const bitmap = await createImageBitmap(new Blob([bytes]));
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    bitmap.close();
    throw new Error('no 2d context');
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  return { data: context.getImageData(0, 0, width, height).data, width, height };
}

self.onmessage = async (event: MessageEvent<PbrWorkerRequest>) => {
  const request = event.data;
  const { id, flipY } = request;

  try {
    const { data, width, height } =
      'bytes' in request ? await decode(request.bytes, request.transcoder) : {
        data: request.pixels,
        width: request.width,
        height: request.height,
      };
    if (flipY) flipRows(data, width, height);

    const maps = derivePbrMaps(data, width, height);
    const response: PbrWorkerResponse = { id, ok: true, width, height, ...maps };
    const transfer = [maps.normal.buffer, maps.metallicRoughness.buffer];
    if (maps.emissive) transfer.push(maps.emissive.buffer);

    self.postMessage(response, transfer);
  } catch (error) {
    const response: PbrWorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
