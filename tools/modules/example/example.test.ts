import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildExample } from './build';
import { createModuleHost } from '../../../src/modules/_api/host';
import { encodeModuleFrame } from '../../../src/modules/_api/packetWire';
import { memoryStore, prepareModules, sha256Hex } from '../../../src/modules/_api/download';
import { isFirstParty, signedText, toBase64Url } from '../../../src/modules/_api/signature';
import { createStreamer, type Frame } from '../../../src/modules/_api/streamer';
import { testGame } from '../../../src/modules/_api/testGame';
import type { StreamedModuleEntry } from '../../../src/modules/servers/serverManifest';

const open: MessagePort[] = [];
afterEach(() => open.splice(0).forEach(p => p.close()));

const importModule = async (bytes: Uint8Array) =>
  (await import(/* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(bytes).toString('base64')}`)).default;

const settle = async () => {
  for (let i = 0; i < 10; i++) await new Promise(r => setTimeout(r, 0));
};

/**
 * The example as a world streams it: built to one file, served, then loaded by the real streamer,
 * signed (in process) or not (in a frame the test fakes: the file's own `connect` over a MessageChannel).
 */
async function stream(signed: boolean) {
  const bytes = await buildExample();
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const publicKey = toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  let entry: StreamedModuleEntry = { id: 'example', version: '1.0.0', api: '^1.1', url: 'example.js', sha256: await sha256Hex(bytes) };
  if (signed) {
    const signature = await crypto.subtle.sign('Ed25519', pair.privateKey, new TextEncoder().encode(signedText(entry)));
    entry = { ...entry, signature: toBase64Url(new Uint8Array(signature)) };
  }
  const { game, calls } = testGame();
  const host = createModuleHost(game);
  const consent = vi.fn(async () => true);
  const streamer = createStreamer({
    host,
    prepare: (list, dropped, url) => prepareModules(list, dropped, url, { store: memoryStore(), fetch: async () => new Response(bytes) }),
    firstParty: e => isFirstParty(e, publicKey),
    consent,
    importModule,
    mountFrame: async (code): Promise<Frame> => {
      const { port1, port2 } = new MessageChannel();
      open.push(port1, port2);
      const m = await importModule(code);
      void m.install(m.connect(port2), 'frame');
      return { port: port1, slot: () => null, remove: () => {} };
    },
    inWorld: async () => {},
    isBuiltIn: () => false,
    notify: n => calls.push(['notice', n.key]),
  });
  await streamer.enter('list:7', 'https://ws.example.com/server.json', [entry], []);
  await settle();
  const before = calls.length;
  host.deliver('example', new TextEncoder().encode('hello'));
  await settle();
  return { calls, echo: calls.slice(before), consent, loaded: streamer.loaded() };
}

describe('the example module', () => {
  it('builds to one file that imports nothing', async () => {
    const text = new TextDecoder().decode(await buildExample());
    expect(text).not.toMatch(/^\s*import\s/m);
    expect(text).toMatch(/export\s*\{/);
  });

  it('runs signed, in process: its window, text and a hello through 0xE8; the echo plays a click', async () => {
    const { calls, echo, consent, loaded } = await stream(true);
    expect(consent).not.toHaveBeenCalled();
    expect(loaded).toEqual([{ id: 'example', version: '1.0.0', firstParty: true }]);
    expect(calls.slice(0, 3)).toEqual([
      ['registerText', 'en', { 'example.title': 'Example' }],
      ['addWindow', 'example:main', 'example', { title: 'example.title', hotKey: undefined, draws: true }],
      ['sendPacket', [...encodeModuleFrame('example', new TextEncoder().encode('hello'))]],
    ]);
    expect(echo).toEqual([['playSound', 'Sound/iButtonClick']]);
  });

  it('runs unsigned in its frame after consent, making the same calls', async () => {
    const signed = await stream(true);
    const unsigned = await stream(false);
    expect(unsigned.consent).toHaveBeenCalledTimes(1);
    expect(unsigned.loaded).toEqual([{ id: 'example', version: '1.0.0', firstParty: false }]);
    expect(unsigned.calls).toEqual(signed.calls);
  });
});
