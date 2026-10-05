import { afterEach, describe, expect, it } from 'vitest';
import { createModuleHost } from './host';
import { serveModule } from './dispatcher';
import { connectModule } from './guest';
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
    expect(await ask(module, { v, id: 1, call: 'sendPacket', args: [] })).toEqual({ id: 1, error: 'no call sendPacket' });
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

  it('stops answering once the client stops serving', () => {
    const { client, stop } = setUp();
    stop();
    expect(client.onmessage).toBe(null);
  });
});
