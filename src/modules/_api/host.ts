// The module API in process (readme.md): one ModuleApi per module id over the game's side (`ports.ts`),
// keeping what each module registered so `dispose(id)` takes it all back. The message binding calls it too.
import type { ComponentType } from 'react';
import { isReservedKey } from '@/controllers/interface/keyBindings';
import { MODULE_ID as NAME, type HeroSnapshot, type ModuleApi, type ModuleWindow, type Tile } from './contract';
import { encodeModuleFrame, maxPayload } from './packetWire';

/** The API a module gets in process: its windows draw React components. */
export type InProcessApi = ModuleApi<ComponentType>;

/** What the host needs of the game: `ports.ts` is the real one, `testGame.ts` the tests'. */
export interface Game {
  registerText(code: string, strings: Readonly<Record<string, string>>): void;
  /** Shows a module's window under `key` (`<module>:<id>`). Returns its removal. */
  addWindow(key: string, module: string, window: ModuleWindow<ComponentType>): () => void;
  /** Plays a catalogue sound; false when there is none by that key. */
  playSound(id: string): boolean;
  /** Plays a named effect at a tile; false when the fx controller has none by that name. */
  playEffect(id: string, at: Tile): boolean;
  hero(): HeroSnapshot;
  onMapChange(fn: (map: number) => void): () => void;
  /** Sends a whole module frame (`packetWire.ts`) to the game server. */
  sendPacket(frame: Uint8Array): void;
}

export interface ModuleHost {
  /** The module's API: the same object until `dispose(id)`. */
  api(id: string): InProcessApi;
  /** Removes the module's windows and ends its listeners; its old API refuses every call after. */
  dispose(id: string): void;
  /** Hands a payload from the server to module `id`'s packet listeners; false when none is listening. */
  deliver(id: string, payload: Uint8Array): boolean;
}

const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const KEY_CODE = /^[A-Za-z0-9]{1,32}$/;

type Held = {
  api: InProcessApi;
  windows: Map<string, () => void>;
  listeners: Set<() => void>;
  packets: Set<(payload: Uint8Array) => void>;
};

export function createModuleHost(game: Game): ModuleHost {
  const held = new Map<string, Held>();

  function build(id: string): Held {
    const windows = new Map<string, () => void>();
    const listeners = new Set<() => void>();
    /** Each map listener, with the game's end of it. */
    const maps = new Map<(map: number) => void, () => void>();
    const packets = new Set<(payload: Uint8Array) => void>();
    const own = (key: string) => key.startsWith(`${id}.`) && key.length > id.length + 1;
    const alive = () => {
      if (held.get(id)?.api !== api) throw new Error(`module ${id} is disposed`);
    };
    const need = (ok: boolean, why: string) => {
      if (!ok) throw new Error(`module ${id}: ${why}`);
    };
    /** Keeps a listener's end for `dispose`; the end it returns runs once. */
    const listen = (off: () => void) => {
      const stop = () => {
        if (listeners.delete(stop)) off();
      };
      listeners.add(stop);
      return stop;
    };

    const api: InProcessApi = {
      registerText(code, strings) {
        alive();
        need(LANGUAGE.test(code), `no language ${code}`);
        const stray = Object.keys(strings).find(key => !own(key));
        need(stray === undefined, `text key ${stray} is not under ${id}.`);
        game.registerText(code, strings);
      },
      registerWindow(window) {
        alive();
        need(NAME.test(window.id), `bad window id ${window.id}`);
        need(own(window.title), `title ${window.title} is not under ${id}.`);
        const { hotKey } = window;
        need(hotKey === undefined || (KEY_CODE.test(hotKey) && !isReservedKey(hotKey)), `hot key ${hotKey} is not free`);
        const key = `${id}:${window.id}`;
        windows.get(key)?.();
        windows.set(key, game.addWindow(key, id, window));
      },
      playSound(sound) {
        alive();
        need(game.playSound(sound), `no sound ${sound}`);
      },
      playEffect(effect, at) {
        alive();
        need(Number.isFinite(at.x) && Number.isFinite(at.y), 'bad tile');
        need(game.playEffect(effect, at), `no effect ${effect}`);
      },
      hero() {
        alive();
        return game.hero();
      },
      // A function subscribed again is a no-op, and either unsubscribe removes it (as `guest.ts`).
      onMapChange(fn) {
        alive();
        if (!maps.has(fn)) maps.set(fn, game.onMapChange(fn));
        return listen(() => {
          maps.get(fn)?.();
          maps.delete(fn);
        });
      },
      onPacket(fn) {
        alive();
        packets.add(fn);
        return listen(() => packets.delete(fn));
      },
      sendPacket(payload) {
        alive();
        need(payload.length <= maxPayload(id), `a packet of ${payload.length} bytes is over the frame limit`);
        game.sendPacket(encodeModuleFrame(id, payload));
      },
    };
    return { api, windows, listeners, packets };
  }

  return {
    api(id) {
      if (!NAME.test(id)) throw new Error(`bad module id ${id}`);
      let h = held.get(id);
      if (!h) held.set(id, (h = build(id)));
      return h.api;
    },
    dispose(id) {
      const h = held.get(id);
      if (!h) return;
      held.delete(id);
      for (const remove of h.windows.values()) remove();
      for (const stop of [...h.listeners]) stop();
    },
    deliver(id, payload) {
      const packets = held.get(id)?.packets;
      if (!packets?.size) return false;
      for (const fn of [...packets]) fn(payload);
      return true;
    },
  };
}
