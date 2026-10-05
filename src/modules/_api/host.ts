// The module API in process (readme.md): one ModuleApi per module id over the game's side (`ports.ts`),
// keeping what each module registered so `dispose(id)` takes it all back. The message binding calls it too.
import type { ComponentType } from 'react';
import { isReservedKey } from '@/controllers/interface/keyBindings';
import type { HeroSnapshot, ModuleApi, ModuleWindow, Tile } from './contract';

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
}

export interface ModuleHost {
  /** The module's API: the same object until `dispose(id)`. */
  api(id: string): InProcessApi;
  /** Removes the module's windows and ends its listeners; its old API refuses every call after. */
  dispose(id: string): void;
}

const NAME = /^[a-z][a-z0-9_]{0,39}$/;
const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const KEY_CODE = /^[A-Za-z0-9]{1,32}$/;

type Held = { api: InProcessApi; windows: Map<string, () => void>; listeners: Set<() => void> };

export function createModuleHost(game: Game): ModuleHost {
  const held = new Map<string, Held>();

  function build(id: string): Held {
    const windows = new Map<string, () => void>();
    const listeners = new Set<() => void>();
    const own = (key: string) => key.startsWith(`${id}.`) && key.length > id.length + 1;
    const alive = () => {
      if (held.get(id)?.api !== api) throw new Error(`module ${id} is disposed`);
    };
    const need = (ok: boolean, why: string) => {
      if (!ok) throw new Error(`module ${id}: ${why}`);
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
      onMapChange(fn) {
        alive();
        const off = game.onMapChange(fn);
        const stop = () => {
          if (listeners.delete(stop)) off();
        };
        listeners.add(stop);
        return stop;
      },
    };
    return { api, windows, listeners };
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
  };
}
