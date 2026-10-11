import { describe, expect, it } from 'vitest';
import { observer } from 'mobx-react-lite';
import { createModuleHost } from './host';
import { encodeModuleFrame, maxPayload } from './packetWire';
import { TEST_HERO, testGame } from './testGame';

const Panel = observer(() => null);

function setUp(id = 'example') {
  const t = testGame();
  const host = createModuleHost(t.game);
  return { ...t, host, api: host.api(id) };
}

describe('the in-process module host', () => {
  it('hands each module one API until it is disposed, and refuses an id that is not a module name', () => {
    const { host, api } = setUp();
    expect(host.api('example')).toBe(api);
    expect(host.api('other')).not.toBe(api);
    host.dispose('example');
    expect(host.api('example')).not.toBe(api);
    expect(() => host.api('Bad Id')).toThrow();
  });

  it('registers text under the module\'s name only', () => {
    const { api, calls } = setUp();
    api.registerText('en', { 'example.title': 'Example' });
    expect(() => api.registerText('en', { 'keys.inventory': 'Mine now' })).toThrow('not under example.');
    expect(() => api.registerText('en', { 'example.': 'Empty' })).toThrow();
    expect(() => api.registerText('english', { 'example.title': 'Example' })).toThrow('no language');
    expect(calls).toEqual([['registerText', 'en', { 'example.title': 'Example' }]]);
  });

  it('adds windows under the module\'s name, replacing one registered again', () => {
    const { api, calls } = setUp();
    api.registerWindow({ id: 'main', title: 'example.title', hotKey: 'F7', draw: Panel });
    api.registerWindow({ id: 'main', title: 'example.title' });
    expect(calls).toEqual([
      ['addWindow', 'example:main', 'example', { title: 'example.title', hotKey: 'F7', draws: true }],
      ['removeWindow', 'example:main'],
      ['addWindow', 'example:main', 'example', { title: 'example.title', hotKey: undefined, draws: false }],
    ]);
  });

  it('refuses a window with a bad id, a title outside the module or a hot key that is not free', () => {
    const { api, calls } = setUp();
    expect(() => api.registerWindow({ id: 'Main Window', title: 'example.title' })).toThrow('window id');
    expect(() => api.registerWindow({ id: 'main', title: 'inventory.title' })).toThrow('not under example.');
    expect(() => api.registerWindow({ id: 'main', title: 'example.title', hotKey: 'Escape' })).toThrow('hot key');
    expect(() => api.registerWindow({ id: 'main', title: 'example.title', hotKey: 'Key I' })).toThrow('hot key');
    expect(calls).toEqual([]);
  });

  it('plays sounds and effects the game knows, and refuses the rest', () => {
    const { api, calls } = setUp();
    api.playSound('Sound/iButtonClick');
    api.playEffect('levelUp', { x: 10, y: 20 });
    expect(() => api.playSound('Sound/nothing')).toThrow('no sound');
    expect(() => api.playEffect('nothing', { x: 10, y: 20 })).toThrow('no effect');
    expect(() => api.playEffect('levelUp', { x: NaN, y: 20 })).toThrow('tile');
    expect(calls).toEqual([
      ['playSound', 'Sound/iButtonClick'],
      ['playEffect', 'levelUp', { x: 10, y: 20 }],
    ]);
  });

  it('hands over the hero\'s snapshot', () => {
    expect(setUp().api.hero()).toEqual(TEST_HERO);
  });

  it('follows map changes until unsubscribed', () => {
    const { api, changeMap, mapListeners } = setUp();
    const seen: number[] = [];
    const off = api.onMapChange(map => seen.push(map));
    changeMap(2);
    off();
    off();
    changeMap(4);
    expect(seen).toEqual([2]);
    expect(mapListeners()).toBe(0);
  });

  it('sends a packet as the module\'s frame, and refuses one over the frame limit', () => {
    const { api, calls } = setUp();
    api.sendPacket(Uint8Array.from([1, 2, 3]));
    api.sendPacket(new Uint8Array(maxPayload('example')));
    expect(() => api.sendPacket(new Uint8Array(maxPayload('example') + 1))).toThrow('frame limit');
    expect(calls).toEqual([
      ['sendPacket', [...encodeModuleFrame('example', Uint8Array.from([1, 2, 3]))]],
      ['sendPacket', [...encodeModuleFrame('example', new Uint8Array(maxPayload('example')))]],
    ]);
  });

  it('hands a module the payloads delivered to it, until unsubscribed', () => {
    const { host, api } = setUp();
    const seen: number[][] = [];
    const off = api.onPacket(p => seen.push([...p]));
    api.onPacket(p => seen.push([-p.length]));
    expect(host.deliver('example', Uint8Array.from([7, 8]))).toBe(true);
    expect(host.deliver('other', Uint8Array.from([9]))).toBe(false);
    off();
    off();
    host.deliver('example', Uint8Array.from([5]));
    expect(seen).toEqual([[7, 8], [-2], [-1]]);
  });

  it('counts a function subscribed twice once, map changes and packets alike, as over messages', () => {
    const { host, api, changeMap, mapListeners } = setUp();
    const seen: string[] = [];
    const onMap = (map: number) => seen.push(`map ${map}`);
    const onPacket = (p: Uint8Array) => seen.push(`packet ${p.join()}`);
    const offMap = api.onMapChange(onMap);
    api.onMapChange(onMap);
    const offPacket = api.onPacket(onPacket);
    api.onPacket(onPacket);
    changeMap(2);
    host.deliver('example', Uint8Array.from([7]));
    expect(seen).toEqual(['map 2', 'packet 7']);
    // Either unsubscribe removes it.
    offMap();
    offPacket();
    expect(mapListeners()).toBe(0);
    expect(host.deliver('example', Uint8Array.from([8]))).toBe(false);
  });

  it('says a payload went nowhere when the module is not listening', () => {
    const { host } = setUp();
    expect(host.deliver('example', Uint8Array.from([1]))).toBe(false);
    expect(host.deliver('nobody', Uint8Array.from([1]))).toBe(false);
  });

  it('takes back a disposed module\'s windows and listeners, and refuses its later calls', () => {
    const { host, api, calls, mapListeners } = setUp();
    api.registerWindow({ id: 'main', title: 'example.title' });
    api.onMapChange(() => {});
    api.onPacket(() => {});
    host.dispose('example');
    expect(calls.at(-1)).toEqual(['removeWindow', 'example:main']);
    expect(mapListeners()).toBe(0);
    expect(host.deliver('example', Uint8Array.from([1]))).toBe(false);
    expect(() => api.playSound('Sound/iButtonClick')).toThrow('disposed');
    expect(() => api.hero()).toThrow('disposed');
    expect(() => api.sendPacket(Uint8Array.from([1]))).toThrow('disposed');
    expect(() => api.onPacket(() => {})).toThrow('disposed');
    host.dispose('example');
  });
});
