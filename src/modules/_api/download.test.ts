import { describe, expect, it, vi } from 'vitest';
import { MAX_MODULE_BYTES, cacheStore, memoryStore, prepareModules, sha256Hex, type ModuleStore } from './download';
import type { StreamedModuleEntry } from '../servers/serverManifest';

const MANIFEST = 'https://ws.example.com/server.json';
const code = new TextEncoder().encode('export default {};');
const other = new TextEncoder().encode('export default { evil: true };');

async function entry(over: Partial<StreamedModuleEntry> = {}): Promise<StreamedModuleEntry> {
  return { id: 'example', version: '1.0.0', api: '^1.1', url: '/server-modules/example.js', sha256: await sha256Hex(code), ...over };
}

/** A fetch answering each URL with these bytes (or a status, or an error). */
function serve(files: Record<string, Uint8Array | number | Error>) {
  return vi.fn(async (url: string) => {
    const f = files[url];
    if (f instanceof Error) throw f;
    if (f === undefined) return new Response('missing', { status: 404 });
    if (typeof f === 'number') return new Response('no', { status: f });
    return new Response(f);
  });
}

describe('sha256Hex', () => {
  it('is the lowercase hex digest', async () => {
    expect(await sha256Hex(new Uint8Array())).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('prepareModules', () => {
  it('downloads a module next to the manifest, checks it and keeps it by hash', async () => {
    const store = memoryStore();
    const fetch = serve({ 'https://ws.example.com/server-modules/example.js': code });
    const e = await entry();
    const { ready, notices } = await prepareModules([e], [], MANIFEST, { store, fetch });
    expect(notices).toEqual([]);
    expect(ready).toEqual([{ entry: e, bytes: code }]);
    expect(fetch).toHaveBeenCalledWith('https://ws.example.com/server-modules/example.js', expect.objectContaining({ credentials: 'omit' }));
    expect(await store.get(e.sha256)).toEqual(code);
  });

  it('takes an absolute address as it is', async () => {
    const fetch = serve({ 'https://cdn.example.org/m.js': code });
    const { ready } = await prepareModules([await entry({ url: 'https://cdn.example.org/m.js' })], [], MANIFEST, { store: memoryStore(), fetch });
    expect(ready).toHaveLength(1);
  });

  it('answers from the cache without a download', async () => {
    const store = memoryStore();
    const e = await entry();
    await store.put(e.sha256, code);
    const fetch = serve({});
    const { ready } = await prepareModules([e], [], MANIFEST, { store, fetch });
    expect(ready).toEqual([{ entry: e, bytes: code }]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('downloads again when the cached copy no longer matches its hash', async () => {
    const store = memoryStore();
    const e = await entry();
    await store.put(e.sha256, other);
    const { ready } = await prepareModules([e], [], MANIFEST, { store, fetch: serve({ 'https://ws.example.com/server-modules/example.js': code }) });
    expect(ready).toEqual([{ entry: e, bytes: code }]);
    expect(await store.get(e.sha256)).toEqual(code);
  });

  it('skips a module whose bytes do not match its hash, with a notice, and keeps nothing', async () => {
    const store = memoryStore();
    const e = await entry();
    const { ready, notices } = await prepareModules([e], [], MANIFEST, { store, fetch: serve({ 'https://ws.example.com/server-modules/example.js': other }) });
    expect(ready).toEqual([]);
    expect(notices).toEqual([{ key: 'moduleStream.hash', params: { id: 'example' } }]);
    expect(await store.get(e.sha256)).toBeNull();
  });

  it('skips a module whose API range this client cannot serve, without downloading it', async () => {
    const fetch = serve({});
    const { ready, notices } = await prepareModules([await entry({ api: '^2.0' })], [], MANIFEST, { store: memoryStore(), fetch });
    expect(ready).toEqual([]);
    expect(notices).toEqual([{ key: 'moduleStream.api', params: { id: 'example', range: '^2.0', have: '1.1.0' } }]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips a module that cannot be downloaded or is too big, with a notice', async () => {
    const big = new Uint8Array(MAX_MODULE_BYTES + 1);
    const url = 'https://ws.example.com/server-modules/example.js';
    for (const answer of [404, new Error('offline'), big]) {
      const e = await entry(answer === big ? { sha256: await sha256Hex(big) } : {});
      const { ready, notices } = await prepareModules([e], [], MANIFEST, { store: memoryStore(), fetch: serve({ [url]: answer }) });
      expect(ready, String(answer)).toEqual([]);
      expect(notices).toEqual([{ key: 'moduleStream.download', params: { id: 'example' } }]);
    }
  });

  it('names each entry the manifest dropped', async () => {
    const { notices } = await prepareModules([], ['broken', '#3'], MANIFEST, { store: memoryStore(), fetch: serve({}) });
    expect(notices).toEqual([
      { key: 'moduleStream.dropped', params: { id: 'broken' } },
      { key: 'moduleStream.dropped', params: { id: '#3' } },
    ]);
  });

  it('keeps the list order and goes on past a module it skips', async () => {
    const a = await entry({ id: 'a', url: 'a.js' });
    const b = await entry({ id: 'b', url: 'b.js', sha256: 'f'.repeat(64) });
    const c = await entry({ id: 'c', url: 'c.js' });
    const files = { 'https://ws.example.com/a.js': code, 'https://ws.example.com/b.js': code, 'https://ws.example.com/c.js': code };
    const { ready, notices } = await prepareModules([a, b, c], [], MANIFEST, { store: memoryStore(), fetch: serve(files) });
    expect(ready.map(r => r.entry.id)).toEqual(['a', 'c']);
    expect(notices).toEqual([{ key: 'moduleStream.hash', params: { id: 'b' } }]);
  });
});

describe('cacheStore', () => {
  /** A Cache Storage cache keeping responses by URL. */
  function fakeCache() {
    const kept = new Map<string, Response>();
    const cache = {
      match: async (key: string) => kept.get(key)?.clone(),
      put: async (key: string, res: Response) => void kept.set(key, res),
    } as unknown as Cache;
    return { cache, kept };
  }

  it('keeps each module under its hash', async () => {
    const { cache, kept } = fakeCache();
    const store: ModuleStore = cacheStore(async () => cache, 'https://play.example.com');
    expect(await store.get('ab')).toBeNull();
    await store.put('ab', code);
    expect([...kept.keys()]).toEqual(['https://play.example.com/__mu_modules/ab']);
    expect(await store.get('ab')).toEqual(code);
  });

  it('works without a cache when Cache Storage fails', async () => {
    const store = cacheStore(async () => Promise.reject(new Error('denied')), 'https://play.example.com');
    await store.put('ab', code);
    expect(await store.get('ab')).toBeNull();
  });
});
