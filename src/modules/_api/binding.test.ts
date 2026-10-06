import { afterEach, describe, expect, it } from 'vitest';
import { createModuleHost } from './host';
import { serveModule } from './dispatcher';
import { connectModule } from './guest';
import { encodeModuleFrame } from './packetWire';
import { MAX_MESSAGE_SIZE, PROTOCOL_VERSION } from './protocol';
import { TEST_HERO, testGame } from './testGame';

// Both ends of the message binding over a real MessageChannel: port1 is the client's, port2 the module's.
const open: MessagePort[] = [];
afterEach(() => open.splice(0).forEach(p => p.close()));

function setUp() {
  const t = testGame();
  const host = createModuleHost(t.game);
  const { port1, port2 } = new MessageChannel();
  open.push(port1, port2);
  const stop = serveModule(port1, host.api('example'));
  return { ...t, host, stop, client: port1, module: port2 };
}

/** Sends what a hostile module could, and waits for the answer. */
function ask(port: MessagePort, message: unknown): Promise<unknown> {
  return new Promise(resolve => {
    port.onmessage = e => resolve(e.data);
    port.postMessage(message);
  });
}

describe('the message binding', () => {
  it('round-trips a call: the host makes it on the game and answers', async () => {
    const { module, calls } = setUp();
    const api = connectModule(module);
    await api.registerText('en', { 'example.title': 'Example' });
    await api.registerWindow({ id: 'main', title: 'example.title', hotKey: 'F7' });
    await api.playSound('Sound/iButtonClick');
    await api.playEffect('levelUp', { x: 10, y: 20 });
    expect(await api.hero()).toEqual(TEST_HERO);
    expect(calls).toEqual([
      ['registerText', 'en', { 'example.title': 'Example' }],
      ['addWindow', 'example:main', 'example', { title: 'example.title', hotKey: 'F7', draws: false }],
      ['playSound', 'Sound/iButtonClick'],
      ['playEffect', 'levelUp', { x: 10, y: 20 }],
    ]);
  });

  it('answers a call the host refuses with a rejected promise', async () => {
    const api = connectModule(setUp().module);
    await expect(api.playSound('Sound/nothing')).rejects.toThrow('no sound');
    await expect(api.registerText('en', { 'keys.inventory': 'Mine' })).rejects.toThrow('not under example.');
  });

  it('refuses an unknown call, a wrong argument type and an oversized message before the game sees them', async () => {
    const { module, calls } = setUp();
    const v = PROTOCOL_VERSION;
    expect(await ask(module, { v, id: 1, call: 'readBag', args: [] })).toEqual({ id: 1, error: 'no call readBag' });
    expect(await ask(module, { v, id: 2, call: 'playSound', args: [42] })).toEqual({ id: 2, error: 'bad arguments to playSound' });
    const big = { 'example.title': 'x'.repeat(MAX_MESSAGE_SIZE) };
    expect(await ask(module, { v, id: 3, call: 'registerText', args: ['en', big] })).toEqual({ id: 3, error: 'message too large' });
    expect(await ask(module, 'hello')).toEqual({ id: null, error: 'not a call' });
    expect(calls).toEqual([]);
  });

  it('delivers map changes to every listener of the module', async () => {
    const { module, changeMap, mapListeners } = setUp();
    const api = connectModule(module);
    const seen: string[] = [];
    api.onMapChange(map => seen.push(`a${map}`));
    api.onMapChange(map => seen.push(`b${map}`));
    await api.hero(); // a call answered after the subscription: the host has it
    expect(mapListeners()).toBe(1);
    changeMap(5);
    await api.hero(); // an answer after the event: the module has it
    expect(seen).toEqual(['a5', 'b5']);
  });

  it('stops the events when the last listener leaves', async () => {
    const { module, changeMap, mapListeners } = setUp();
    const api = connectModule(module);
    const seen: number[] = [];
    const offA = api.onMapChange(map => seen.push(map));
    const offB = api.onMapChange(map => seen.push(map));
    offA();
    await api.hero();
    expect(mapListeners()).toBe(1);
    offB();
    await api.hero();
    expect(mapListeners()).toBe(0);
    changeMap(5);
    await api.hero();
    expect(seen).toEqual([]);
  });

  it('stops the events and refuses every call once the host disposes the module', async () => {
    const { module, host, changeMap, mapListeners } = setUp();
    const api = connectModule(module);
    const seen: number[] = [];
    api.onMapChange(map => seen.push(map));
    await api.hero();
    host.dispose('example');
    expect(mapListeners()).toBe(0);
    changeMap(6);
    await expect(api.hero()).rejects.toThrow('disposed');
    expect(seen).toEqual([]);
  });

  it('sends a packet as the module\'s frame, and refuses one over the message cap', async () => {
    const { module, calls } = setUp();
    const api = connectModule(module);
    await api.sendPacket(Uint8Array.from([1, 2, 3]));
    await api.sendPacket(new Uint8Array(0));
    await expect(api.sendPacket(new Uint8Array((MAX_MESSAGE_SIZE / 4) * 3))).rejects.toThrow('message too large');
    expect(calls).toEqual([
      ['sendPacket', [...encodeModuleFrame('example', Uint8Array.from([1, 2, 3]))]],
      ['sendPacket', [...encodeModuleFrame('example', new Uint8Array(0))]],
    ]);
  });

  it('delivers the module\'s packets to every packet listener, until the last one leaves', async () => {
    const { module, host } = setUp();
    const api = connectModule(module);
    const seen: string[] = [];
    const offA = api.onPacket(p => seen.push(`a${p.join()}`));
    const offB = api.onPacket(p => seen.push(`b${p.join()}`));
    await api.hero();
    expect(host.deliver('example', Uint8Array.from([7, 8]))).toBe(true);
    await api.hero();
    offA();
    await api.hero();
    expect(host.deliver('example', Uint8Array.from([9]))).toBe(true);
    await api.hero();
    offB();
    await api.hero();
    expect(host.deliver('example', Uint8Array.from([1]))).toBe(false);
    expect(seen).toEqual(['a7,8', 'b7,8', 'b9']);
  });

  it('stops the packets once the host disposes the module', async () => {
    const { module, host } = setUp();
    const api = connectModule(module);
    api.onPacket(() => {});
    await api.hero();
    host.dispose('example');
    expect(host.deliver('example', Uint8Array.from([1]))).toBe(false);
    await expect(api.sendPacket(Uint8Array.from([1]))).rejects.toThrow('disposed');
  });

  it('stops answering, and ends the module\'s listeners, once the client stops serving', async () => {
    const { client, stop, module, host, mapListeners } = setUp();
    const api = connectModule(module);
    api.onMapChange(() => {});
    api.onPacket(() => {});
    await api.hero();
    stop();
    expect(client.onmessage).toBe(null);
    expect(mapListeners()).toBe(0);
    expect(host.deliver('example', Uint8Array.from([1]))).toBe(false);
  });
});
