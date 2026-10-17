/* eslint-disable no-undef */
//
// Asset cache for the pre-download screen.
//
// The page does the downloading (it owns the progress bar and the cancel
// button); this only decides what a later request is answered from. That
// split keeps the interesting logic testable in the page and leaves a worker
// small enough to read in one sitting.
//
// Why a worker at all, when warming the HTTP cache is free: the client loads
// music with `new Audio(url)`, which issues Range requests, and a browser
// will happily re-download a ranged media file whose full response is sitting
// in the HTTP cache. Music is 75 MB - the single biggest thing that silently
// falls out of a plain warm. An `<img>` (item icons) and Babylon's texture
// loader (the packs) are also outside the client's own fetch helpers. A
// worker is the only place that sees all four.
//
// Nothing here is a fallback for being offline: a miss goes to the network
// exactly as it would have without the worker.

const CACHE = 'mu-assets-v1';

// The build this worker came with (`sw.js?build=`, assetDownload.ts). A deploy changes the URL, so
// the browser installs the worker anew: it drops what another build downloaded (a model changed
// under the same name stayed the old one for good) and asks the server once about each asset.
const BUILD = new URL(self.location.href).searchParams.get('build') || '';
const META = 'mu-meta';
const BUILD_KEY = '/__mu-build';

/** Kept across builds: the biggest download, and it does not change. */
const KEPT_ACROSS_BUILDS = /\/Music\/|\.(mp3|ogg|wav)$/i;

/** Assets this worker has already asked the server about. */
const revalidated = new Set();

/** Only these are ours. Everything else is passed straight through. */
const ASSET_PREFIXES = [
  '/game-assets/',
  '/game-assets-v097d/',
  '/packs/',
  '/packs-v097d/',
  '/Data/',
  '/Data-v097d/',
  '/items/',
];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Drop caches from an older shape of this worker.
      for (const name of await caches.keys()) {
        if (name.startsWith('mu-assets-') && name !== CACHE) await caches.delete(name);
      }
      await dropOtherBuilds();
      forgetBundles();
      await self.clients.claim();
    })()
  );
});

/** What another build (or one before builds were told) downloaded goes, the music kept. */
async function dropOtherBuilds() {
  if (!BUILD) return;
  const meta = await caches.open(META);
  const stored = await meta.match(BUILD_KEY);
  if (stored && (await stored.text()) === BUILD) return;
  const cache = await caches.open(CACHE);
  for (const request of await cache.keys()) {
    if (!KEPT_ACROSS_BUILDS.test(new URL(request.url).pathname)) await cache.delete(request);
  }
  await meta.put(BUILD_KEY, new Response(BUILD));
}

// ---- bundles: a group the page stored as one file (assetDownload.ts `storeBundle`) ----

const BUNDLE_MARKERS = '/__mu-bundle/';
const TYPES = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', json: 'application/json',
};
const typeOf = path => TYPES[path.split('.').pop().toLowerCase()] || 'application/octet-stream';
const pathOf = key => new URL(key, self.location.href).pathname;

/** path -> [bundle path, offset, length], from this build's markers; rebuilt when the page stores one. */
let bundleFiles = null;
/** bundle path -> its Blob (disk-backed: a slice reads only its own bytes). */
const bundleBlobs = new Map();

async function loadBundleIndex(cache) {
  const map = new Map();
  for (const request of await cache.keys()) {
    if (!new URL(request.url).pathname.startsWith(BUNDLE_MARKERS)) continue;
    const marker = await (await cache.match(request))?.json().catch(() => null);
    if (!marker || marker.build !== BUILD) continue;
    for (const [key, offset, length] of marker.files) map.set(pathOf(key), [pathOf(marker.bundle), offset, length]);
  }
  return map;
}

async function fromBundle(cache, path) {
  bundleFiles ??= await loadBundleIndex(cache);
  const hit = bundleFiles.get(path);
  if (!hit) return null;
  const [bundle, offset, length] = hit;
  let blob = bundleBlobs.get(bundle);
  if (!blob) {
    const stored = await cache.match(bundle);
    if (!stored) return null;
    blob = await stored.blob();
    bundleBlobs.set(bundle, blob);
  }
  return new Response(blob.slice(offset, offset + length), {
    headers: { 'Content-Type': typeOf(path), 'Content-Length': String(length) },
  });
}

function forgetBundles() {
  bundleFiles = null;
  bundleBlobs.clear();
}

function isAsset(url) {
  return url.origin === self.location.origin && ASSET_PREFIXES.some(p => url.pathname.startsWith(p));
}

/**
 * Answer a Range request out of a full cached response.
 *
 * This is the whole reason the worker exists. `new Audio(src)` asks for
 * `Range: bytes=0-`, and without a 206 here the element goes to the network
 * and the pre-download bought nothing.
 */
async function rangeFrom(cached, header) {
  const buffer = await cached.arrayBuffer();
  const total = buffer.byteLength;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return new Response(buffer, { status: 200, headers: cached.headers });

  let start = match[1] === '' ? null : Number(match[1]);
  let end = match[2] === '' ? null : Number(match[2]);

  // `bytes=-500` means the last 500 bytes.
  if (start === null) {
    if (end === null) return new Response(buffer, { status: 200, headers: cached.headers });
    start = Math.max(0, total - end);
    end = total - 1;
  } else if (end === null || end >= total) {
    end = total - 1;
  }

  if (start > end || start >= total) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  const headers = new Headers(cached.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');

  return new Response(buffer.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (!isAsset(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Ranged requests never match a stored full response, so look the plain
      // URL up by hand rather than passing `request`.
      const cached = (await cache.match(url.pathname + url.search)) || (await fromBundle(cache, url.pathname));

      if (cached) {
        const range = request.headers.get('range');
        return range ? rangeFrom(cached.clone(), range) : cached;
      }

      // Not downloaded: behave as if the worker were not installed. It is
      // deliberately not written to the cache here - what is stored is what
      // the player chose on the download screen, so the numbers the screen
      // reports stay true. The first time this worker sees one it asks the
      // server whether the browser's copy is current (a 304 when it is), so a
      // copy an older build left in the HTTP cache is not reused.
      const key = url.pathname + url.search;
      if (revalidated.has(key)) return fetch(request);
      revalidated.add(key);
      return fetch(request, { cache: 'no-cache' });
    })()
  );
});

// The page asks what is stored, and can clear it.
self.addEventListener('message', event => {
  const data = event.data ?? {};
  const reply = payload => event.ports[0]?.postMessage(payload);

  if (data.type === 'mu-cache-has') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        bundleFiles = await loadBundleIndex(cache);
        const have = await Promise.all(
          data.urls.map(u => cache.match(u).then(hit => Boolean(hit) || bundleFiles.has(pathOf(u))))
        );
        reply({ have });
      })()
    );
  }

  if (data.type === 'mu-bundles-changed') {
    forgetBundles();
    reply({ ok: true });
  }

  if (data.type === 'mu-cache-clear') {
    forgetBundles();
    event.waitUntil(caches.delete(CACHE).then(ok => reply({ ok })));
  }
});
