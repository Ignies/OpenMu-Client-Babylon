import { makeAutoObservable, runInAction } from 'mobx';

/**
 * The debug menu registry (documentation/debug_menu/ARCHITECTURE.md).
 *
 * One window, one registry: features register a `DebugModule` here and the
 * window (`ui/components/debugMenu/`) renders whatever is registered - it
 * knows no module by name. Modules describe their content as data (rows of
 * checks, sliders, buttons, lists and live info lines) carrying getters and
 * setters as closures; the registry stores nothing beyond `open` and the
 * module list, and imports nothing but MobX, so a gameplay system can
 * register a panel without pulling UI code.
 *
 * The menu is an offline-only tool: it is mounted by `WorldPage` behind
 * `Store.isOffline` and every mutation a module performs must go through a
 * seam that already has a public owner (a `requestWarp` event, a
 * `setGameOption`, a `/time` command) - the menu itself owns no game state.
 */

/** One clickable entry: a chip in a `buttons` row or a row in a `list`. */
export type DebugAction = {
  id: string;
  label: string;
  /** Drawn highlighted while true (the frozen phase, the current map). */
  active?: () => boolean;
  onClick: () => void;
};

export type DebugRow =
  | {
      kind: 'check';
      id: string;
      label: string;
      get: () => boolean;
      set: (value: boolean) => void;
    }
  | {
      kind: 'slider';
      id: string;
      label: string;
      min?: number;
      max: number;
      step?: number;
      get: () => number;
      set: (value: number) => void;
      /** What the value plate prints; the raw number when omitted. */
      display?: (value: number) => string;
    }
  | { kind: 'buttons'; id: string; items: readonly DebugAction[] }
  | { kind: 'list'; id: string; items: () => readonly DebugAction[] }
  | { kind: 'info'; id: string; label: string; value: () => string }
  | { kind: 'section'; id: string; label: string };

export type DebugModule = {
  /** Unique kebab-case; also the tab's key. */
  id: string;
  /** The tab label. */
  title: string;
  /** Tabs sort ascending; the built-ins use 10..40. Default 100. */
  order?: number;
  /** The tab's rows, rebuilt per render - read live state in the closures. */
  rows: () => readonly DebugRow[];
};

class DebugMenuState {
  open = false;

  modules: DebugModule[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  toggle(): void {
    this.open = !this.open;
  }

  close(): void {
    this.open = false;
  }

  register(module: DebugModule): () => void {
    if (this.modules.some(m => m.id === module.id)) {
      console.error(`debugMenu: module '${module.id}' is already registered`);
      return () => {};
    }

    this.modules.push(module);
    this.modules.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

    // Not a class method, so not an action by itself.
    return () =>
      runInAction(() => {
        const i = this.modules.indexOf(module);
        if (i >= 0) this.modules.splice(i, 1);
      });
  }
}

export const DebugMenu = new DebugMenuState();

/** Add a tab to the debug menu. Returns the unregister. */
export function registerDebugModule(module: DebugModule): () => void {
  return DebugMenu.register(module);
}
