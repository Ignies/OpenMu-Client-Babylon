import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseServerLine } from './serverList';
import { ServerConfig } from './serverConfig';
import { serverManifestUrl } from './serverServices';
import { defineModule, installModules, moduleOn } from '../module';
import {
  ORIGINAL_SETTINGS,
  loadServerManifest,
  onModulesListed,
  parseServerManifest,
  resetServerManifests,
  serverOffersLoginTokens,
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
      settings: { ...ORIGINAL_SETTINGS, heldHitRequest: true },
      modulesOff: [],
      loginTokens: false,
      modules: [],
      modulesDropped: [],
    });
    expect(parseServerManifest({ version: 1, settings: { retryLoginWhenConnected: true } })?.settings).toEqual({
      ...ORIGINAL_SETTINGS,
      retryLoginWhenConnected: true,
    });
  });

  it('gives a setting the document leaves out its original value', () => {
    expect(parseServerManifest({ version: 1, settings: {} })?.settings).toEqual(ORIGINAL_SETTINGS);
  });

  // A newer server may know settings that this client does not.
  it('skips unknown keys', () => {
    expect(
      parseServerManifest({ version: 1, somethingNew: [], settings: { heldHitRequest: true, somethingNew: 3 } })
    ).toEqual({
      version: 1,
      settings: { ...ORIGINAL_SETTINGS, heldHitRequest: true },
      modulesOff: [],
      loginTokens: false,
      modules: [],
      modulesDropped: [],
    });
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

  it('reads the optional modules the server turned off', () => {
    expect(parseServerManifest({ version: 1, settings: {}, modulesOff: ['events', 'band', 'events'] })?.modulesOff).toEqual(['events', 'band']);
  });

  it('refuses the whole document when modulesOff is not a list of module ids', () => {
    const many = Array.from({ length: 65 }, (_, i) => `m${i}`);
    for (const modulesOff of ['events', [1], ['Events'], ['no spaces'], many]) {
      expect(parseServerManifest({ version: 1, settings: {}, modulesOff }), JSON.stringify(modulesOff)).toBeNull();
    }
  });

  it('reads whether the world issues login tokens, off when it does not say', () => {
    expect(parseServerManifest({ version: 1, settings: {}, loginTokens: true })?.loginTokens).toBe(true);
    expect(parseServerManifest({ version: 1, settings: {}, loginTokens: false })?.loginTokens).toBe(false);
    expect(parseServerManifest({ version: 1, settings: {} })?.loginTokens).toBe(false);
    expect(parseServerManifest({ version: 1, settings: {}, loginTokens: 'yes' })).toBeNull();
    expect(parseServerManifest({ version: 1, settings: {}, loginTokens: 1 })).toBeNull();
  });

  describe('modules (streamed, phase 5)', () => {
    const sha = 'a'.repeat(64);
    const signature = `${'A'.repeat(85)}w`;
    const entry = { id: 'example', version: '1.0.0', api: '^1.1', url: '/server-modules/example.js', sha256: sha };
    const read = (modules: unknown) => parseServerManifest({ version: 1, settings: {}, modules });

    it('lists none when the world says nothing', () => {
      expect(parseServerManifest({ version: 1, settings: {} })).toMatchObject({ modules: [], modulesDropped: [] });
    });

    it('reads each entry, signed or not', () => {
      expect(read([entry, { ...entry, id: 'signed', url: 'https://cdn.example.com/s.js', signature }])).toMatchObject({
        modules: [entry, { ...entry, id: 'signed', url: 'https://cdn.example.com/s.js', signature }],
        modulesDropped: [],
      });
    });

    it('drops a malformed entry and names it, keeping the rest and the document', () => {
      const bad = [
        { ...entry, id: 'no_sha', sha256: 'A'.repeat(64) },
        { ...entry, id: 'short_sha', sha256: 'a'.repeat(63) },
        { ...entry, id: 'bad_version', version: '1.0' },
        { ...entry, id: 'lead_zero', version: '01.0.0' },
        { ...entry, id: 'no_api', api: '' },
        { ...entry, id: 'long_api', api: 'x'.repeat(65) },
        { ...entry, id: 'ftp', url: 'ftp://example.com/x.js' },
        { ...entry, id: 'script', url: 'javascript:alert(1)' },
        { ...entry, id: 'no_url', url: undefined },
        { ...entry, id: 'bad_signature', signature: 'abc' },
        { ...entry, id: 'num_signature', signature: 1 },
        { ...entry, id: 'claims_core', core: true },
        { ...entry, id: 'Upper' },
        'example',
      ];
      const manifest = read([entry, ...bad, entry]);
      expect(manifest?.modules).toEqual([entry]);
      expect(manifest?.modulesDropped).toEqual([
        'no_sha', 'short_sha', 'bad_version', 'lead_zero', 'no_api', 'long_api', 'ftp', 'script', 'no_url',
        'bad_signature', 'num_signature', 'claims_core', '#13', '#14', 'example',
      ]);
      expect(manifest?.settings).toEqual(ORIGINAL_SETTINGS);
    });

    it('keeps at most 32', () => {
      const many = Array.from({ length: 33 }, (_, i) => ({ ...entry, id: `m${i}` }));
      expect(read(many)).toMatchObject({ modulesDropped: ['m32'] });
      expect(read(many)?.modules).toHaveLength(32);
    });

    it('drops everything when modules is not a list', () => {
      expect(read({ example: entry })).toMatchObject({ modules: [], modulesDropped: ['modules'] });
    });
  });

  it('refuses the whole document when a known setting has the wrong type', () => {
    expect(parseServerManifest({ version: 1, settings: { heldHitRequest: 'true' } })).toBeNull();
    expect(parseServerManifest({ version: 1, settings: { heldHitRequest: 1 } })).toBeNull();
    expect(parseServerManifest({ version: 1, settings: { retryLoginWhenConnected: 'yes' } })).toBeNull();
    expect(parseServerManifest({ version: 1, settings: { muHelperAfterReconnect: 1 } })).toBeNull();
    expect(parseServerManifest({ version: 1, settings: { autoManaPotion: 'on' } })).toBeNull();
    expect(parseServerManifest({ version: 1, settings: { autoQuiver: 'on' } })).toBeNull();
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

  it('turns off the modules the world lists, and back on for a world that lists none', async () => {
    installModules([defineModule({ id: 'manifest_events', install: () => {} })]);
    serve('{"version":1,"settings":{},"modulesOff":["manifest_events"]}');
    await loadServerManifest(listed);
    expect(moduleOn('manifest_events')).toBe(false);
    serve('{"version":1,"settings":{}}');
    await loadServerManifest(listed);
    expect(moduleOn('manifest_events')).toBe(true);
  });

  it('hands the fetched module list to the streamer, and an empty one when the fetch fails', async () => {
    const heard: unknown[] = [];
    const off = onModulesListed((world, url, modules, dropped) => heard.push([world, url, modules, dropped]));
    const entry = { id: 'example', version: '1.0.0', api: '^1.1', url: 'example.js', sha256: 'a'.repeat(64) };
    serve(JSON.stringify({ version: 1, settings: {}, modules: [entry, { id: 'bad' }] }));
    await loadServerManifest(listed);
    serve('gone', 404);
    await loadServerManifest(listed);
    off();
    await loadServerManifest(listed);
    expect(heard).toEqual([
      [listed.id, 'https://ws.ignies.net/server.json', [entry], ['bad']],
      [listed.id, 'https://ws.ignies.net/server.json', [], []],
    ]);
  });

  it('offers login tokens only where the world says so', async () => {
    expect(serverOffersLoginTokens()).toBe(false);
    serve('{"version":1,"settings":{},"loginTokens":true}');
    await loadServerManifest(listed);
    expect(serverOffersLoginTokens()).toBe(true);
    serve('not found', 404);
    await loadServerManifest(listed);
    expect(serverOffersLoginTokens()).toBe(false);
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
