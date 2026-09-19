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
      await self.clients.claim();
    })()
  );
});

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
      const cached = await cache.match(url.pathname + url.search);

      if (cached) {
        const range = request.headers.get('range');
        return range ? rangeFrom(cached.clone(), range) : cached;
      }

      // Not downloaded: behave as if the worker were not installed. It is
      // deliberately not written to the cache here - what is stored is what
      // the player chose on the download screen, so the numbers the screen
      // reports stay true.
      return fetch(request);
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
        const have = await Promise.all(data.urls.map(u => cache.match(u).then(Boolean)));
        reply({ have });
      })()
    );
  }

  if (data.type === 'mu-cache-clear') {
    event.waitUntil(caches.delete(CACHE).then(ok => reply({ ok })));
  }
});
