import { afterEach, describe, expect, it, vi } from 'vitest';
import { createModuleHost } from './host';
import { connectModule } from './guest';
import { memoryStore, prepareModules, sha256Hex, type StreamNotice } from './download';
import { isFirstParty, signedText, toBase64Url } from './signature';
import { createStreamer, type Frame, type StreamerDeps } from './streamer';
import { testGame } from './testGame';
import type { StreamedModuleEntry } from '../servers/serverManifest';

const MANIFEST = 'https://ws.example.com/server.json';
const WORLD = 'list:7';

/** A module file: its window, and a line in `log` when it installs. */
const moduleCode = (id: string, extra = '') => `export default {
  api: '^1.1',${extra}
  async install(api) {
    globalThis.__p5log?.push('install ${id}');
    await api.registerText('en', { '${id}.title': 'Title' });
    await api.registerWindow({ id: 'main', title: '${id}.title' });
    api.onPacket(() => {});
    await api.hero();
  },
};`;

const toData = (bytes: Uint8Array) => `data:text/javascript;base64,${Buffer.from(bytes).toString('base64')}`;
const importModule = async (bytes: Uint8Array) => (await import(/* @vite-ignore */ toData(bytes))).default;

const open: MessagePort[] = [];
const log: string[] = [];
(globalThis as { __p5log?: string[] }).__p5log = log;
afterEach(() => {
  open.splice(0).forEach(p => p.close());
  log.length = 0;
});

/** Throwaway owner key, made in memory: the build's public half and a signer. */
async function owner() {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const publicKey = toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  const sign = async (e: StreamedModuleEntry) =>
    toBase64Url(new Uint8Array(await crypto.subtle.sign('Ed25519', pair.privateKey, new TextEncoder().encode(signedText(e)))));
  return { publicKey, sign };
}

/** A world serving these module files, and a streamer over a recording game. */
async function setup(files: Record<string, string>, over: Partial<StreamerDeps> = {}) {
  const key = await owner();
  const bytes: Record<string, Uint8Array> = {};
  for (const [id, code] of Object.entries(files)) bytes[id] = new TextEncoder().encode(code);
  const fetch = vi.fn(async (url: string) => {
    const id = /\/(\w+)\.js$/.exec(url)?.[1] ?? '';
    return bytes[id] ? new Response(bytes[id]) : new Response('gone', { status: 404 });
  });
  const { game, calls } = testGame();
  const host = createModuleHost(game);
  const notices: StreamNotice[] = [];
  const frames: { id: string; removed: boolean }[] = [];
  const consent = vi.fn(async () => true);
  // The sandbox as a test can have it: the module's code over a real MessageChannel, no iframe.
  const mountFrame = vi.fn(async (code: Uint8Array, id: string): Promise<Frame> => {
    const { port1, port2 } = new MessageChannel();
    open.push(port1, port2);
    const m = await importModule(code);
    void m.install((m.connect ?? connectModule)(port2));
    const frame = { id, removed: false };
    frames.push(frame);
    return { port: port1, slot: () => null, remove: () => void (frame.removed = true) };
  });
  const deps: StreamerDeps = {
    host,
    prepare: (entries, dropped, url) => prepareModules(entries, dropped, url, { store: memoryStore(), fetch }),
    firstParty: entry => isFirstParty(entry, key.publicKey),
    consent,
    importModule,
    mountFrame,
    inWorld: async () => {},
    isBuiltIn: id => id === 'party',
    notify: n => void notices.push(n),
    ...over,
  };
  const entry = async (id: string, signed: boolean, extra: Partial<StreamedModuleEntry> = {}): Promise<StreamedModuleEntry> => {
    const e: StreamedModuleEntry = {
      id,
      version: '1.0.0',
      api: '^1.1',
      url: `/server-modules/${id}.js`,
      sha256: await sha256Hex(bytes[id] ?? new Uint8Array()),
      ...extra,
    };
    return signed ? { ...e, signature: await key.sign(e) } : e;
  };
  return { streamer: createStreamer(deps), host, calls, notices, frames, consent, mountFrame, entry, key };
}

/** Lets the module's messages and their answers cross the channel. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await new Promise(r => setTimeout(r, 0));
};

describe('the streamer', () => {
  it('runs a signed module in process, without asking', async () => {
    const s = await setup({ first: moduleCode('first') });
    await s.streamer.enter(WORLD, MANIFEST, [await s.entry('first', true)], []);
    expect(s.consent).not.toHaveBeenCalled();
    expect(s.mountFrame).not.toHaveBeenCalled();
    expect(s.calls).toContainEqual(['addWindow', 'first:main', 'first', { title: 'first.title', hotKey: undefined, draws: false }]);
    expect(s.streamer.loaded()).toEqual([{ id: 'first', version: '1.0.0', firstParty: true }]);
    expect(s.notices).toEqual([]);
  });

  it('runs an unsigned module in its frame once the player allows it, its window showing the frame', async () => {
    const s = await setup({ third: moduleCode('third') });
    const e = await s.entry('third', false);
    await s.streamer.enter(WORLD, MANIFEST, [e], []);
    await settle();
    expect(s.consent).toHaveBeenCalledWith(WORLD, e);
    expect(s.frames).toEqual([{ id: 'third', removed: false }]);
    expect(s.calls).toContainEqual(['addWindow', 'third:main', 'third', { title: 'third.title', hotKey: undefined, draws: true }]);
    expect(s.streamer.loaded()).toEqual([{ id: 'third', version: '1.0.0', firstParty: false }]);
  });

  it('treats a bad signature, or a client built without a key, as third party', async () => {
    const s = await setup({ forged: moduleCode('forged') });
    const e = await s.entry('forged', true);
    await s.streamer.enter(WORLD, MANIFEST, [{ ...e, version: '1.0.1' }], []);
    expect(s.streamer.loaded()).toEqual([{ id: 'forged', version: '1.0.1', firstParty: false }]);

    const keyless = await setup({ signed: moduleCode('signed') }, { firstParty: entry => isFirstParty(entry, undefined) });
    await keyless.streamer.enter(WORLD, MANIFEST, [await keyless.entry('signed', true)], []);
    expect(keyless.streamer.loaded()).toEqual([{ id: 'signed', version: '1.0.0', firstParty: false }]);
  });

  it('skips a third-party module the player does not allow', async () => {
    const s = await setup({ third: moduleCode('third') });
    s.consent.mockResolvedValue(false);
    await s.streamer.enter(WORLD, MANIFEST, [await s.entry('third', false)], []);
    expect(s.mountFrame).not.toHaveBeenCalled();
    expect(s.streamer.loaded()).toEqual([]);
    expect(s.notices).toEqual([{ key: 'moduleStream.declined', params: { id: 'third' } }]);
  });

  it('refuses a module that claims core, or a built-in module\'s name', async () => {
    const s = await setup({ claims: moduleCode('claims', '\n  core: true,'), party: moduleCode('party') });
    await s.streamer.enter(WORLD, MANIFEST, [await s.entry('claims', true), await s.entry('party', true)], []);
    expect(log).toEqual([]);
    expect(s.streamer.loaded()).toEqual([]);
    expect(s.notices).toEqual([
      { key: 'moduleStream.core', params: { id: 'claims' } },
      { key: 'moduleStream.builtIn', params: { id: 'party' } },
    ]);
  });

  it('takes back what a module that fails to start had registered', async () => {
    const broken = `export default { install(api) { api.registerText('en', { 'broken.title': 'B' }); api.registerWindow({ id: 'main', title: 'broken.title' }); throw new Error('no'); } };`;
    const s = await setup({ broken });
    await s.streamer.enter(WORLD, MANIFEST, [await s.entry('broken', true)], []);
    expect(s.calls).toContainEqual(['removeWindow', 'broken:main']);
    expect(s.streamer.loaded()).toEqual([]);
    expect(s.notices).toEqual([{ key: 'moduleStream.failed', params: { id: 'broken' } }]);
  });

  it('passes on the notices of the download, and loads the rest', async () => {
    const s = await setup({ good: moduleCode('good') });
    await s.streamer.enter(WORLD, MANIFEST, [await s.entry('missing', true), await s.entry('good', true)], ['bad']);
    expect(s.notices).toEqual([
      { key: 'moduleStream.dropped', params: { id: 'bad' } },
      { key: 'moduleStream.download', params: { id: 'missing' } },
    ]);
    expect(s.streamer.loaded().map(m => m.id)).toEqual(['good']);
  });

  it('unloads every module when the player leaves the world: windows, listeners and frames gone', async () => {
    const s = await setup({ first: moduleCode('first'), third: moduleCode('third') });
    await s.streamer.enter(WORLD, MANIFEST, [await s.entry('first', true), await s.entry('third', false)], []);
    await settle();
    expect(s.host.deliver('first', new Uint8Array([1]))).toBe(true);
    expect(s.host.deliver('third', new Uint8Array([1]))).toBe(true);
    s.streamer.leave();
    expect(s.calls).toContainEqual(['removeWindow', 'first:main']);
    expect(s.calls).toContainEqual(['removeWindow', 'third:main']);
    expect(s.frames).toEqual([{ id: 'third', removed: true }]);
    expect(s.host.deliver('first', new Uint8Array([1]))).toBe(false);
    expect(s.host.deliver('third', new Uint8Array([1]))).toBe(false);
    expect(s.streamer.loaded()).toEqual([]);
  });

  it('keeps an unchanged module across a new list, reloads a changed one and drops a removed one', async () => {
    const s = await setup({ keep: moduleCode('keep'), gone: moduleCode('gone'), changed: moduleCode('changed') });
    const keep = await s.entry('keep', true);
    await s.streamer.enter(WORLD, MANIFEST, [keep, await s.entry('gone', true), await s.entry('changed', true)], []);
    expect(log).toEqual(['install keep', 'install gone', 'install changed']);
    log.length = 0;
    const s2 = { changed: await s.entry('changed', true, { sha256: 'f'.repeat(64) }) };
    await s.streamer.enter(WORLD, MANIFEST, [keep, s2.changed], []);
    expect(log).toEqual([]);
    expect(s.calls).toContainEqual(['removeWindow', 'gone:main']);
    expect(s.calls).toContainEqual(['removeWindow', 'changed:main']);
    expect(s.streamer.loaded().map(m => m.id)).toEqual(['keep']);
  });

  it('starts over for another world', async () => {
    const s = await setup({ first: moduleCode('first') });
    const e = await s.entry('first', true);
    await s.streamer.enter(WORLD, MANIFEST, [e], []);
    await s.streamer.enter('list:8', 'https://ws.other.net/server.json', [e], []);
    expect(log).toEqual(['install first', 'install first']);
  });

  it('loads nothing when the player leaves before the modules are ready', async () => {
    let enterWorld = () => {};
    const s = await setup({ first: moduleCode('first') }, { inWorld: () => new Promise<void>(r => (enterWorld = r)) });
    const pending = s.streamer.enter(WORLD, MANIFEST, [await s.entry('first', true)], []);
    await settle();
    s.streamer.leave();
    enterWorld();
    await pending;
    expect(log).toEqual([]);
    expect(s.streamer.loaded()).toEqual([]);
  });

  it('loads nothing for a world that lists none', async () => {
    const s = await setup({});
    await s.streamer.enter(WORLD, MANIFEST, [], []);
    expect(s.calls).toEqual([]);
    expect(s.notices).toEqual([]);
  });
});
