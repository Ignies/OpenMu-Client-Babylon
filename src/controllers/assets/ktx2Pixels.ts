/**
 * A KTX2 file's top mip level as RGBA8 on the CPU.
 *
 * Texture packs can ship KTX2, which the GPU keeps compressed. Anything that
 * needs a pack texture's pixels (the Enhanced material derives its normal
 * and roughness maps from them) cannot hand the file to `createImageBitmap`,
 * so it is transcoded here with the Basis transcoder the client already
 * hosts for Babylon (`public/js/basisTranscoder/`).
 *
 * No Babylon imports: this runs inside the PBR map worker.
 */

export type Ktx2Image = { data: Uint8ClampedArray; width: number; height: number };

export type TranscoderUrls = { js: string; wasm: string };

type Ktx2File = {
  isValid(): boolean;
  getWidth(): number;
  getHeight(): number;
  startTranscoding(): boolean;
  getImageTranscodedSizeInBytes(level: number, layer: number, face: number, format: number): number;
  transcodeImage(
    out: Uint8Array,
    level: number,
    layer: number,
    face: number,
    format: number,
    flags: number,
    channel0: number,
    channel1: number
  ): boolean;
  close(): void;
  delete(): void;
};

export type Transcoder = {
  KTX2File: new (data: Uint8Array) => Ktx2File;
  initializeBasis(): void;
};

/** `cTFRGBA32` in the transcoder's format list. */
const RGBA32 = 13;

const MAGIC = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];

export function isKtx2(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < MAGIC.length) return false;
  const head = new Uint8Array(bytes, 0, MAGIC.length);
  return MAGIC.every((b, i) => head[i] === b);
}

/**
 * The transcoder is a classic Emscripten script. A module worker cannot
 * `importScripts` it, so it is evaluated from its source instead.
 */
export async function instantiateTranscoder(
  code: string,
  wasmBinary: ArrayBuffer
): Promise<Transcoder> {
  const factory = new Function(`${code}\nreturn BASIS;`)() as (options: {
    wasmBinary: ArrayBuffer;
  }) => Promise<Transcoder>;
  const transcoder = await factory({ wasmBinary });
  transcoder.initializeBasis();
  return transcoder;
}

const loaded = new Map<string, Promise<Transcoder>>();

/** Fetched once per page (or worker) and reused. */
export function loadTranscoder(urls: TranscoderUrls): Promise<Transcoder> {
  let pending = loaded.get(urls.js);
  if (!pending) {
    pending = (async () => {
      const [code, wasm] = await Promise.all([
        fetch(urls.js).then(r => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))),
        fetch(urls.wasm).then(r =>
          r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))
        ),
      ]);
      return instantiateTranscoder(code, wasm);
    })();
    // A failed fetch must not stick: the next texture tries again.
    pending.catch(() => loaded.delete(urls.js));
    loaded.set(urls.js, pending);
  }
  return pending;
}

/** Rows come out top first, the same order `createImageBitmap` gives. */
export function decodeKtx2(bytes: ArrayBuffer, transcoder: Transcoder): Ktx2Image {
  const file = new transcoder.KTX2File(new Uint8Array(bytes));
  try {
    if (!file.isValid()) throw new Error('not a valid KTX2 file');
    const width = file.getWidth();
    const height = file.getHeight();
    if (!file.startTranscoding()) throw new Error('KTX2 transcoding did not start');

    const out = new Uint8Array(file.getImageTranscodedSizeInBytes(0, 0, 0, RGBA32));
    if (!file.transcodeImage(out, 0, 0, 0, RGBA32, 0, -1, -1)) {
      throw new Error('KTX2 transcoding failed');
    }
    return { data: new Uint8ClampedArray(out.buffer), width, height };
  } finally {
    file.close();
    file.delete();
  }
}
