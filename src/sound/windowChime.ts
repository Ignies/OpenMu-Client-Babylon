import { reaction } from 'mobx';
import { Store } from '../store';
import { playUiSound } from './ui';

/**
 * Window open / close chime (UIWindows.cpp:657-687, UIManager.cpp:311 -
 * SOUND_INTERFACE01 whenever an interface window is shown or hidden).
 * Button clicks live in MuButton / `uiClick`; this only watches window state.
 *
 * Its own module, apart from `ui.ts`: this is the only interface sound that
 * reads `Store`, and keeping that import out of `ui.ts` keeps `ui.ts` (and
 * the `libs/sfx.ts` re-export every window uses) out of the store module
 * cycle. Installed from boot.tsx rather than at import time - a module-level
 * reaction evaluated `Store` before its initialiser ran (TDZ ReferenceError
 * on every page load).
 */
export function installUiWindowChime(): void {
  reaction(
    () => [
      Store.inventoryEnabled,
      Store.characterInfoEnabled,
      Store.optionsEnabled,
    ],
    () => playUiSound('window')
  );
}
