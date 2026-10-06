import { afterEach, describe, expect, it } from 'vitest';
import type { ModuleApi, RemoteModuleApi } from './contract';
import { createModuleHost } from './host';
import { serveModule } from './dispatcher';
import { connectModule } from './guest';
import { encodeModuleFrame } from './packetWire';
import { testGame } from './testGame';

/**
 * A module as a server would ship it: it touches nothing but the API, and awaits every call, so the
 * same code runs in process (calls answer at once) and in the sandbox (calls answer with promises).
 */
async function exampleModule(api: ModuleApi | RemoteModuleApi, heard: unknown[]): Promise<() => void> {
  await api.registerText('en', { 'example.title': 'Example' });
  await api.registerWindow({ id: 'main', title: 'example.title', hotKey: 'F7' });
  await api.playSound('Sound/iButtonClick');
  const offPackets = api.onPacket(payload => heard.push([...payload]));
  await api.sendPacket(Uint8Array.from([1, 2, 3]));
  const offMaps = api.onMapChange(map => heard.push(map));
  return () => {
    offPackets();
    offMaps();
  };
}

const open: MessagePort[] = [];
afterEach(() => open.splice(0).forEach(p => p.close()));

/** Runs the example over one binding: two map changes and two packets, the module leaving between them. */
async function run(binding: 'in process' | 'messages') {
  const { game, calls, changeMap } = testGame();
  const host = createModuleHost(game);
  let api: ModuleApi | RemoteModuleApi = host.api('example');
  if (binding === 'messages') {
    const { port1, port2 } = new MessageChannel();
    open.push(port1, port2);
    serveModule(port1, host.api('example'));
    api = connectModule(port2);
  }
  // A call's answer comes after everything sent before it: over messages, the other end has caught up.
  const settle = async () => void (await api.hero());
  const heard: unknown[] = [];
  const off = await exampleModule(api, heard);
  await settle();
  changeMap(4);
  host.deliver('example', Uint8Array.from([9]));
  await settle();
  off();
  await settle();
  changeMap(5);
  host.deliver('example', Uint8Array.from([10]));
  await settle();
  return { calls, heard };
}

describe('the example module', () => {
  it('makes its calls in process', async () => {
    expect(await run('in process')).toEqual({
      calls: [
        ['registerText', 'en', { 'example.title': 'Example' }],
        ['addWindow', 'example:main', 'example', { title: 'example.title', hotKey: 'F7', draws: false }],
        ['playSound', 'Sound/iButtonClick'],
        ['sendPacket', [...encodeModuleFrame('example', Uint8Array.from([1, 2, 3]))]],
      ],
      heard: [4, [9]],
    });
  });

  it('makes the same calls over the message binding', async () => {
    expect(await run('messages')).toEqual(await run('in process'));
  });
});
