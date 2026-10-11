// The module's end of the message binding (readme.md): the ModuleApi shape over a port, for a module in
// the sandbox. Every call answers with a promise. Imports nothing of the game.
import type { RemoteModuleApi } from './contract';
import { PROTOCOL_VERSION, fromBase64, toBase64, type CallArgs, type CallName, type CallResult, type PortLike } from './protocol';

type Pending = { resolve(result: unknown): void; reject(error: Error): void };

/** The module API over `port` (its end of the channel the client handed over). */
export function connectModule(port: PortLike): RemoteModuleApi {
  let next = 0;
  const pending = new Map<number, Pending>();
  const maps = new Set<(map: number) => void>();
  const packets = new Set<(payload: Uint8Array) => void>();

  port.onmessage = ({ data }) => {
    if (typeof data !== 'object' || data === null) return;
    if (data.event === 'mapChange') {
      for (const fn of [...maps]) fn(data.data.map);
      return;
    }
    if (data.event === 'packet') {
      const payload = fromBase64(data.data.payload);
      for (const fn of [...packets]) fn(payload);
      return;
    }
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    if ('error' in data) p.reject(new Error(String(data.error)));
    else p.resolve(data.result);
  };

  function call<K extends CallName>(name: K, args: CallArgs[K]): Promise<CallResult<K>> {
    return new Promise((resolve, reject) => {
      const id = next++;
      pending.set(id, { resolve: resolve as (result: unknown) => void, reject });
      port.postMessage({ v: PROTOCOL_VERSION, id, call: name, args });
    });
  }

  const quietly = (name: 'onMapChange' | 'offMapChange' | 'onPacket' | 'offPacket') =>
    void call(name, []).catch((e: Error) => console.warn(`[module api] ${name}: ${e.message}`));

  /** Adds a listener; the first one subscribes on the client, the last one to leave unsubscribes. */
  function subscribe<T>(listeners: Set<T>, fn: T, on: 'onMapChange' | 'onPacket', off: 'offMapChange' | 'offPacket') {
    listeners.add(fn);
    if (listeners.size === 1) quietly(on);
    return () => {
      if (listeners.delete(fn) && listeners.size === 0) quietly(off);
    };
  }

  return {
    registerText: (code, strings) => call('registerText', [code, strings]),
    // The window is this module's own frame: the client only needs its name.
    registerWindow: ({ id, title, hotKey }) => call('registerWindow', [{ id, title, hotKey }]),
    playSound: id => call('playSound', [id]),
    playEffect: (id, { x, y }) => call('playEffect', [id, { x, y }]),
    hero: () => call('hero', []),
    onMapChange: fn => subscribe(maps, fn, 'onMapChange', 'offMapChange'),
    sendPacket: payload => call('sendPacket', [toBase64(payload)]),
    onPacket: fn => subscribe(packets, fn, 'onPacket', 'offPacket'),
  };
}
