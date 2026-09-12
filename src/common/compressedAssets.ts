/**
 * Gzip sidecars for the game data.
 *
 * The converted assets are binary but not compressed: a GLB is a vertex blob
 * behind a large ASCII glTF header (`player.glb` is 8.1 MB, 5.2 MB of it
 * JSON), a `.OZT` is an uncompressed TGA, a `.att` is a tile array. gzip
 * takes the tree to roughly a third, and the character rig to a sixth. Static
 * hosts will not compress these content types on their own, so the bytes are
 * packed at build time (`tools/compressAssets.ts`) into a `<file>.gz` beside
 * each one, and unpacked here with the browser's own `DecompressionStream`.
 *
 * Nothing depends on a sidecar existing. Every read falls back to the plain
 * file - a build published without them, a half-copied tree, a host that
 * mangles them, a browser with no `DecompressionStream`: the scene still
 * loads, it just pays full size for that file. The decision is made once per
 * session so a deployment without sidecars costs one 404 rather than one per
 * asset, and a run of failures after that turns the whole thing off.
 *
 * `OZJ` and the audio are deliberately not on the list: they are JPEG and MP3
 * already and gzip hands back 0.81-0.93 of the original, which does not pay
 * for the extra request.
 */

/** Written beside every compressible asset by `tools/compressAssets.ts`. */
export const COMPRESSED_SUFFIX = '.gz';

/**
 * Extensions that get a sidecar. Shared with the build tool, which is the
 * only producer: "on this list" and "has a sidecar" have to mean the same
 * thing, or the client pays a 404 in front of files that never had one.
 */
export const COMPRESSED_EXTENSIONS: ReadonlySet<string> = new Set([
  // converted models
  'glb',
  // sprites: OZT is a TGA behind a header (OZJ is a JPEG - not on this list)
  'ozt',
  // terrain: height field, tile attributes, tile map, object records
  'ozb',
  'att',
  'map',
  'obj',
  // tables and scripts: minimap markers, quests, the camera walk scripts
  'bmd',
  'cws',
]);

export function isCompressedAsset(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0];
  const ext = path.split('.').pop()?.toLowerCase();
  return !!ext && COMPRESSED_EXTENSIONS.has(ext);
}

const GZIP_MAGIC = [0x1f, 0x8b];

/** `?nogz` takes every read to the plain file: the A/B, and the kill switch. */
function turnedOff(): boolean {
  try {
    return new URLSearchParams(location.search).has('nogz');
  } catch {
    return false;
  }
}

/** No decoder, no sidecars: every read goes straight to the plain file. */
const CAN_UNPACK = typeof DecompressionStream !== 'undefined' && !turnedOff();

/**
 * Whether this deployment ships sidecars at all, answered by the first
 * compressible read and awaited by every other one - they are waiting on the
 * network anyway, and the answer arrives with that first response's headers.
 */
let answered: Promise<boolean> | null = null;
let answer: ((available: boolean) => void) | null = null;

/** Revocable after the answer: a tree that starts failing is switched off. */
let enabled = true;

let failures = 0;

const MAX_FAILURES = 3;

function disable(reason: string): null {
  if (enabled) {
    enabled = false;
    console.warn(`Compressed assets off (${reason}); serving the plain files.`);
  }
  return null;
}

function failed(url: string, reason: unknown): null {
  console.warn(`Could not unpack ${url}${COMPRESSED_SUFFIX}, using the plain file:`, reason);
  if (++failures >= MAX_FAILURES) disable(`${failures} failures`);
  return null;
}

async function unpack(packed: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([packed as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The sidecar's bytes, or null for "there is no usable sidecar for this". */
async function fromSidecar(url: string): Promise<Uint8Array | null> {
  if (!CAN_UNPACK || !enabled || !isCompressedAsset(url)) return null;

  let probing = false;

  if (!answered) {
    probing = true;
    answered = new Promise<boolean>(resolve => {
      answer = resolve;
    });
  } else if (!(await answered) || !enabled) {
    return null;
  }

  const settle = (available: boolean) => {
    if (!probing) return;
    probing = false;
    answer?.(available);
    if (!available) disable('this build ships none');
  };

  try {
    const res = await fetch(url + COMPRESSED_SUFFIX);
    const type = res.headers.get('content-type') ?? '';
    // A dev server answers a missing path with index.html and HTTP 200, so
    // the status alone does not say the file is there (same trap as
    // `downloadBytesBuffer`).
    const missing = !res.ok || type.startsWith('text/html');

    settle(!missing);

    if (missing) return null;

    const packed = new Uint8Array(await res.arrayBuffer());

    // A host that answers `.gz` with `Content-Encoding: gzip` (vite's dev
    // server does, and so does nginx's `gzip_static`) has had the browser
    // unwrap it already: the wire still carried the packed bytes, and what is
    // left here is the asset. Only unpack what is still gzip.
    const gzipped =
      packed[0] === GZIP_MAGIC[0] && packed[1] === GZIP_MAGIC[1];

    const bytes = gzipped ? await unpack(packed) : packed;
    failures = 0;
    return bytes;
  } catch (error) {
    settle(false);
    return failed(url, error);
  }
}

/**
 * A sidecar that read back fine but turned out not to hold the asset. Only a
 * reader that parses the bytes can tell - a host that answers `.gz` with
 * `Content-Encoding` has the browser unwrap it, so a truncated sidecar
 * arrives here as a short but otherwise plausible file. Counts towards the
 * same limit as a failure inside this module.
 */
export function sidecarFailed(url: string, reason: unknown): void {
  failed(url, reason);
}

export async function plainBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  // vite's SPA fallback answers a missing path with index.html and HTTP 200;
  // a BMD / OZJ / GLB reader then decodes HTML into plausible-looking garbage
  // (the master tree once showed groups 134-255 that way). Fail loudly instead.
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || type.startsWith('text/html')) {
    throw new Error(
      `Data file not found: ${url} (HTTP ${res.status}, ${type || 'no content-type'})`
    );
  }

  return new Uint8Array(await res.arrayBuffer());
}

/**
 * One asset's bytes: the sidecar when this build has one and the browser can
 * unpack it, the file itself otherwise. Every caller that reads a data file
 * goes through here.
 *
 * `fromSidecar` says where the bytes came from, for a reader that can check
 * them: it should report the failure and read the plain file rather than pass
 * a bad payload on (`loadContainerBytes` in `modelLoader.ts`).
 */
export async function fetchAsset(
  url: string
): Promise<{ bytes: Uint8Array; fromSidecar: boolean }> {
  const packed = await fromSidecar(url);

  return packed
    ? { bytes: packed, fromSidecar: true }
    : { bytes: await plainBytes(url), fromSidecar: false };
}

export async function fetchAssetBytes(url: string): Promise<Uint8Array> {
  return (await fetchAsset(url)).bytes;
}

/**
 * Warm the HTTP cache for an asset without reading it. Warms whichever of the
 * two URLs `fetchAssetBytes` would ask for, so the later read is a cache hit
 * rather than a second download; a prefetch never starts the probe itself.
 */
export async function prefetchAsset(url: string): Promise<void> {
  const sidecar =
    CAN_UNPACK && enabled && isCompressedAsset(url) && !!answered && (await answered) && enabled;

  await fetch(sidecar ? url + COMPRESSED_SUFFIX : url).then(
    res => res.body?.cancel(),
    () => {}
  );
}
