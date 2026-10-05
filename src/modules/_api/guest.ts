// The module's end of the message binding (readme.md): the ModuleApi shape over a port, for a module in
// the sandbox. Every call answers with a promise. Imports nothing of the game.
import type { RemoteModuleApi } from './contract';
import { PROTOCOL_VERSION, type CallArgs, type CallName, type CallResult, type PortLike } from './protocol';

type Pending = { resolve(result: unknown): void; reject(error: Error): void };

/** The module API over `port` (its end of the channel the client handed over). */
export function connectModule(port: PortLike): RemoteModuleApi {
  let next = 0;
  const pending = new Map<number, Pending>();
  const maps = new Set<(map: number) => void>();

  port.onmessage = ({ data }) => {
    if (typeof data !== 'object' || data === null) return;
    if (data.event === 'mapChange') {
      for (const fn of [...maps]) fn(data.data.map);
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

  const quietly = (name: 'onMapChange' | 'offMapChange') =>
    void call(name, []).catch((e: Error) => console.warn(`[module api] ${name}: ${e.message}`));

  return {
    registerText: (code, strings) => call('registerText', [code, strings]),
    // The window is this module's own frame: the client only needs its name.
    registerWindow: ({ id, title, hotKey }) => call('registerWindow', [{ id, title, hotKey }]),
    playSound: id => call('playSound', [id]),
    playEffect: (id, { x, y }) => call('playEffect', [id, { x, y }]),
    hero: () => call('hero', []),
    onMapChange(fn) {
      maps.add(fn);
      if (maps.size === 1) quietly('onMapChange');
      return () => {
        if (maps.delete(fn) && maps.size === 0) quietly('offMapChange');
      };
    },
  };
}
