import { reaction } from 'mobx';
import { Store } from '../store';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx } from './listener';

/**
 * Interface sounds (DSPlaySound.h: SOUND_CLICK01, SOUND_ERROR01,
 * SOUND_INTERFACE01, SOUND_GET_ITEM01, SOUND_DROP_ITEM01, SOUND_DROP_GOLD01,
 * SOUND_DRINK01, SOUND_EAT_APPLE01, SOUND_JEWEL01/02, SOUND_LEVEL_UP,
 * SOUND_MENU01, SOUND_REPAIR, SOUND_WHISPER).
 *
 * Driven by: the UI (`uiClick`, `playUiSound`) and the window open / close
 * chime (`installUiWindowChime`). Command-only: no per-frame state.
 * Read by: nothing — it only plays.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Interface sound → catalogue key. Data, so callers name the intent. */
export const UI_SOUNDS = {
  click: 'Sound/iButtonClick',
  error: 'Sound/iButtonError',
  window: 'Sound/iCreateWindow',
  menuMove: 'Sound/iButtonMove',
  getItem: 'Sound/pGetItem',
  dropItem: 'Sound/pDropItem',
  dropMoney: 'Sound/pDropMoney',
  drink: 'Sound/pDrink',
  eatApple: 'Sound/pEatApple',
  jewel: 'Sound/eGem',
  gemstone: 'Sound/Jewel_Sound',
  levelUp: 'Sound/pLevelUp',
  repair: 'Sound/iRepair',
  whisper: 'Sound/iWhisper',
  mix: 'Sound/eMix',
  mixFailed: 'Sound/eBreak',
  duelWindow: 'Sound/iDuel_Window',
  duelStart: 'Sound/iDuelStart',
} as const satisfies Record<string, Sounds>;

export type UiSound = keyof typeof UI_SOUNDS;
/** Sound key behind each interface sound, for callers that position it. */
export const UI_SOUND_KEYS: Record<UiSound, Sounds> = UI_SOUNDS;

// ---- 2. state + commands ---------------------------------------------------
// One-shots: nothing to hold between frames.

export function playUiSound(kind: UiSound): void {
  playSfx(UI_SOUNDS[kind]);
}

/** `onClick` wrapper for interface buttons (Button.cpp:134 SOUND_CLICK01). */
export function uiClick<T extends unknown[]>(
  handler?: (...args: T) => void
): (...args: T) => void {
  return (...args: T) => {
    playUiSound('click');
    handler?.(...args);
  };
}

/**
 * Window open / close chime (UIWindows.cpp:657-687, UIManager.cpp:311 —
 * SOUND_INTERFACE01 whenever an interface window is shown or hidden).
 * Button clicks live in MuButton / `uiClick`; this only watches window state.
 *
 * Installed from main.tsx rather than at import time: `store` → `logic` →
 * here → `store` is a cycle, and a module-level reaction evaluated `Store`
 * before its initialiser ran (TDZ ReferenceError on every page load).
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

// ---- 3. the layer ----------------------------------------------------------

export const uiLayer: SoundLayer = { name: 'ui' };
