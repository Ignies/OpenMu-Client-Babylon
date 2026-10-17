import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const SOURCE = readFileSync(join(import.meta.dirname, '..', '..', '..', 'public', 'sw.js'), 'utf8');
const ORIGIN = 'https://mu.test';

type Store = Map<string, Response>;
type Listener = (event: Record<string, unknown>) => void;

const keyOf = (r: string | { url: string }) => {
  if (typeof r === 'string') return r;
  const url = new URL(r.url);
  return url.pathname + url.search;
};

/** `public/sw.js` run against an in-memory `caches` with the stores given. */
function worker(build: string, stores: Map<string, Store>) {
  const listeners: Record<string, Listener> = {};
  const cacheOf = (store: Store) => ({
    match: async (r: string) => store.get(keyOf(r))?.clone(),
    put: async (r: string, response: Response) => void store.set(keyOf(r), response),
    keys: async () => [...store.keys()].map(k => ({ url: ORIGIN + k })),
    delete: async (r: { url: string }) => store.delete(keyOf(r)),
  });
  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return cacheOf(stores.get(name) as Store);
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const self = {
    location: { href: `${ORIGIN}/sw.js?build=${build}`, origin: ORIGIN },
    addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  const fetch = vi.fn(async () => new Response('net'));
  new Function('self', 'caches', 'fetch', SOURCE)(self, caches, fetch);

  const activate = async () => {
    let done: Promise<unknown> = Promise.resolve();
    listeners.activate({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
  };
  const get = async (path: string) => {
    let answer: Promise<Response> = Promise.resolve(new Response());
    const request = new Request(ORIGIN + path);
    listeners.fetch({ request, respondWith: (p: Promise<Response>) => (answer = p) });
    await answer;
    return request;
  };
  const answer = async (request: Request) => {
    let response: Promise<Response> = Promise.resolve(new Response());
    listeners.fetch({ request, respondWith: (p: Promise<Response>) => (response = p) });
    return response;
  };
  const message = (data: unknown) =>
    new Promise(resolve => {
      listeners.message({ data, ports: [{ postMessage: resolve }], waitUntil: () => {} });
    });
  return { activate, get, answer, message, fetch };
}

const MODEL = '/game-assets/Object1/Object01.glb';
const MUSIC = '/Data/Music/main_theme.mp3';

function downloaded(build: string | null): Map<string, Store> {
  const stores = new Map<string, Store>([['mu-assets-v1', new Map([[MODEL, new Response('old')], [MUSIC, new Response('song')]])]]);
  if (build !== null) stores.set('mu-meta', new Map([['/__mu-build', new Response(build)]]));
  return stores;
}

describe('the asset cache worker', () => {
  it('drops what an older build downloaded on a new build, the music kept', async () => {
    for (const before of ['b1', null]) {
      const stores = downloaded(before);
      await worker('b2', stores).activate();
      const assets = stores.get('mu-assets-v1');
      expect(assets?.has(MODEL)).toBe(false);
      expect(assets?.has(MUSIC)).toBe(true);
      expect(await stores.get('mu-meta')?.get('/__mu-build')?.clone().text()).toBe('b2');
    }
  });

  it('keeps what its own build downloaded', async () => {
    const stores = downloaded('b2');
    await worker('b2', stores).activate();
    expect(stores.get('mu-assets-v1')?.has(MODEL)).toBe(true);
  });

  it('asks the server once whether an asset it does not hold is still current', async () => {
    const w = worker('b2', new Map());
    const first = await w.get('/game-assets/Object1/Object02.glb');
    const second = await w.get('/game-assets/Object1/Object02.glb');
    expect(w.fetch).toHaveBeenNthCalledWith(1, first, { cache: 'no-cache' });
    expect(w.fetch).toHaveBeenNthCalledWith(2, second);
  });
});

/** A bundle as `assetDownload.ts` stores it: the bytes under its url, and the marker naming each file's slice. */
function bundled(build: string): Map<string, Store> {
  const body = 'MUB1....headerabcdefgh';
  const at = body.indexOf('abc');
  const files = [
    ['./game-assets/World1/EncTerrain1.att.gz', at, 3],
    ['./Data/World1/Tile.OZJ.webp', at + 3, 5],
  ];
  return new Map<string, Store>([
    [
      'mu-assets-v1',
      new Map([
        ['/bundles/season6-map_1.bin', new Response(body)],
        ['/__mu-bundle/map:1', new Response(JSON.stringify({ build, bundle: './bundles/season6-map_1.bin', files }))],
      ]),
    ],
  ]);
}

describe('bundles', () => {
  const answer = async (w: ReturnType<typeof worker>, path: string, range?: string) => {
    const request = new Request(ORIGIN + path, range ? { headers: { range } } : undefined);
    return w.answer(request);
  };

  it('answers a file it does not hold on its own out of its build bundle', async () => {
    const w = worker('b2', bundled('b2'));
    expect(await (await answer(w, '/game-assets/World1/EncTerrain1.att.gz')).text()).toBe('abc');
    const tile = await answer(w, '/Data/World1/Tile.OZJ.webp');
    expect(await tile.text()).toBe('defgh');
    expect(tile.headers.get('Content-Type')).toBe('image/webp');
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it('answers a range out of a bundled file', async () => {
    const w = worker('b2', bundled('b2'));
    const part = await answer(w, '/Data/World1/Tile.OZJ.webp', 'bytes=1-2');
    expect(part.status).toBe(206);
    expect(await part.text()).toBe('ef');
  });

  it('never answers from another build bundle', async () => {
    const w = worker('b2', bundled('b1'));
    expect(await (await answer(w, '/Data/World1/Tile.OZJ.webp')).text()).toBe('net');
  });

  it('counts bundled files as held', async () => {
    const w = worker('b2', bundled('b2'));
    expect(await w.message({ type: 'mu-cache-has', urls: ['./Data/World1/Tile.OZJ.webp', './Data/World1/Other.OZJ'] })).toEqual({
      have: [true, false],
    });
  });
});
