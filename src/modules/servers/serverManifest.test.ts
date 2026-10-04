import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseServerLine } from './serverList';
import { ServerConfig } from './serverConfig';
import { serverManifestUrl } from './serverServices';
import {
  ORIGINAL_SETTINGS,
  loadServerManifest,
  parseServerManifest,
  resetServerManifests,
  serverSetting,
} from './serverManifest';

const world = (line: string) => {
  const parsed = parseServerLine(line);
  if (!parsed) throw new Error(`line did not parse: ${line}`);
  return parsed;
};

const listed = world('[S6EP3:Ignies:A world:es](ignies.net)');
const addressed = world('[S6EP3:Somewhere:A world:en](10.0.0.4:44405@ws://203.0.113.7:3000)');

/** A localStorage the module can write its cache to. */
function fakeStorage(): Map<string, string> {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

/** `fetch` answering with this body (a string, or an Error to throw). */
function serve(body: string | Error, status = 200) {
  const fetch = vi.fn(async () => {
    if (body instanceof Error) throw body;
    return new Response(body, { status });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('parseServerManifest', () => {
  it('reads a version 1 document', () => {
    expect(parseServerManifest({ version: 1, settings: { heldHitRequest: true } })).toEqual({
      version: 1,
      settings: { heldHitRequest: true },
    });
  });

  it('gives a setting the document leaves out its original value', () => {
    expect(parseServerManifest({ version: 1, settings: {} })?.settings).toEqual(ORIGINAL_SETTINGS);
  });

  // A newer server may know settings, and list modules, that this client does not.
  it('skips unknown keys', () => {
    expect(
      parseServerManifest({ version: 1, modules: [], settings: { heldHitRequest: true, somethingNew: 3 } })
    ).toEqual({ version: 1, settings: { heldHitRequest: true } });
  });

  it('refuses another version', () => {
    expect(parseServerManifest({ version: 2, settings: { heldHitRequest: true } })).toBeNull();
    expect(parseServerManifest({ version: '1', settings: {} })).toBeNull();
    expect(parseServerManifest({ settings: {} })).toBeNull();
  });

  it('refuses anything else', () => {
    for (const raw of [null, 'x', 1, [], { version: 1 }, { version: 1, settings: [] }, { version: 1, settings: null }]) {
      expect(parseServerManifest(raw), JSON.stringify(raw)).toBeNull();
    }
  });

  it('refuses the whole document when a known setting has the wrong type', () => {
    expect(parseServerManifest({ version: 1, settings: { heldHitRequest: 'true' } })).toBeNull();
    expect(parseServerManifest({ version: 1, settings: { heldHitRequest: 1 } })).toBeNull();
  });
});

describe('serverManifestUrl', () => {
  it('is next to the proxy', () => {
    expect(serverManifestUrl(listed)).toBe('https://ws.ignies.net/server.json');
    expect(serverManifestUrl(addressed)).toBe('http://203.0.113.7:3000/server.json');
  });
});

describe('the server settings', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = fakeStorage();
    resetServerManifests();
    ServerConfig.setListed([listed]);
    ServerConfig.select(listed.id);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetServerManifests();
    ServerConfig.setListed([]);
  });

  it('follows the manifest the world serves', async () => {
    const fetch = serve('{"version":1,"settings":{"heldHitRequest":true}}');
    await loadServerManifest(listed);
    expect(fetch).toHaveBeenCalledWith('https://ws.ignies.net/server.json', expect.anything());
    expect(serverSetting('heldHitRequest')).toBe(true);
  });

  it('keeps the original behaviour when the manifest is missing, unreachable or invalid', async () => {
    for (const [body, status] of [
      ['not found', 404],
      [new Error('offline'), 0],
      ['{"version":1,', 200],
      ['{"version":2,"settings":{"heldHitRequest":true}}', 200],
      ['{"version":1,"settings":{"heldHitRequest":"yes"}}', 200],
    ] as const) {
      serve(body, status || 200);
      await loadServerManifest(listed);
      expect(serverSetting('heldHitRequest'), String(body)).toBe(false);
    }
  });

  it('caches per server: the cached copy applies until the fetch answers, a failure drops it', async () => {
    serve('{"version":1,"settings":{"heldHitRequest":true}}');
    await loadServerManifest(listed);

    // Next launch: the cache answers before anything is fetched.
    resetServerManifests();
    let answer: (r: Response) => void = () => {};
    vi.stubGlobal('fetch', () => new Promise<Response>(r => (answer = r)));
    expect(serverSetting('heldHitRequest')).toBe(true);
    const pending = loadServerManifest(listed);
    answer(new Response('gone', { status: 404 }));
    await pending;
    expect(serverSetting('heldHitRequest')).toBe(false);
    expect(storage.get('mu_server_manifests')).toBe('{}');
  });

  it('keeps one cache entry per server', async () => {
    serve('{"version":1,"settings":{"heldHitRequest":true}}');
    await loadServerManifest(listed);
    serve('{"version":1,"settings":{"heldHitRequest":false}}');
    await loadServerManifest(addressed);
    expect(Object.keys(JSON.parse(storage.get('mu_server_manifests') ?? '{}'))).toEqual([
      'https://ws.ignies.net/server.json',
      'http://203.0.113.7:3000/server.json',
    ]);
    expect(serverSetting('heldHitRequest')).toBe(true);
  });

  it('is fetched when a world is entered', () => {
    const fetch = serve('{"version":1,"settings":{}}');
    ServerConfig.markPlayed(listed.id);
    expect(fetch).toHaveBeenCalledWith('https://ws.ignies.net/server.json', expect.anything());
  });
});
