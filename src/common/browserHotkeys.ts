/**
 * The browser's own keyboard, kept off the game's.
 *
 * Ctrl plus a game key is a browser command in a tab. Ctrl+S sorts the
 * inventory and opened the save dialog, Ctrl+A opens the master skill tree
 * and selected the whole page, Ctrl+D opens the command window and
 * bookmarked the client - and Ctrl+W, the second potion slot with Ctrl held,
 * closed the tab outright in the middle of a fight.
 *
 * Three layers, strongest first:
 *
 *  1. `keyboard.lock()` while the document is in fullscreen. This is the only
 *     way a page is ever handed Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Tab or
 *     Ctrl+1..9: outside fullscreen the browser eats them before any listener
 *     runs. Chromium only, and F11 below is how the fullscreen the lock needs
 *     gets asked for.
 *  2. `preventDefault` on every reserved chord a page is allowed to cancel -
 *     reload, zoom, find, print, save, open, bookmark, history, caret
 *     browsing, the address bar, the function keys.
 *  3. `beforeunload` as the last net for what neither of those reaches:
 *     Alt+F4, the window's close button, Cmd+W on a Mac, Ctrl+W on a browser
 *     with no lock. The page cannot stop those, only ask.
 *
 * Only the default action is cancelled, never the propagation: the hot keys
 * and the walk read the same event afterwards, so Ctrl+S still sorts the bag.
 *
 * Bare game keys are not this module's business - Tab, Alt and Space are
 * guarded for their own reasons in `ecs/systems/keyboardInputSystem.ts`.
 * This one owns chords and function keys.
 */

import { GameOptions, onGameOptionsChanged } from './gameOptions';

/**
 * Ctrl (or Cmd) plus one of these is a browser command. None of them is
 * anything but a hot key to the game, which still gets the event.
 */
const CTRL_KEYS: ReadonlySet<string> = new Set([
  // Select all, bookmark, address bar, find, downloads, history, print,
  // open, quit, reload, save, new tab, new window, view source, close, redo.
  'KeyA', 'KeyB', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK',
  'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT',
  'KeyU', 'KeyW', 'KeyY',
  // Zoom in / out / reset.
  'Minus', 'Equal', 'NumpadAdd', 'NumpadSubtract',
  // Tab switching, and Ctrl+Tab cycling.
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
  'Digit7', 'Digit8', 'Digit9',
  'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5',
  'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
  'Tab', 'PageUp', 'PageDown',
]);

/**
 * ...except while a text field has the focus, where these are how the text is
 * edited. Chat has to keep its copy, paste and undo.
 */
const CTRL_EDIT_KEYS: ReadonlySet<string> = new Set([
  'KeyA', 'KeyC', 'KeyV', 'KeyX', 'KeyZ', 'KeyY',
  'Home', 'End', 'Backspace', 'Delete', 'Insert',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
]);

/**
 * Chords that take the page away entirely. Blocked even with the chat box
 * open: a reload loses the session whatever the focus was on.
 */
const CTRL_FATAL_KEYS: ReadonlySet<string> = new Set([
  'KeyW', 'KeyT', 'KeyN', 'KeyR', 'KeyQ',
]);

/** Alt plus one of these: back, forward, home page, address bar. */
const ALT_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft', 'ArrowRight', 'Home', 'KeyD',
]);

/**
 * Help, find, reload, address bar, caret browsing, the menu bar, fullscreen.
 * F12 is left out on purpose: the devtools chords are not cancelable anyway,
 * and QA needs the panel.
 */
const FUNCTION_KEYS: ReadonlySet<string> = new Set([
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11',
]);

/**
 * The codes handed to `keyboard.lock()`: everything above, plus the ones no
 * amount of `preventDefault` reaches. `KeyI`, `KeyJ` and `KeyC` stay out so
 * Ctrl+Shift+I / J / C still open the devtools in fullscreen.
 */
const LOCKED_CODES: readonly string[] = [
  ...CTRL_KEYS,
  ...FUNCTION_KEYS,
  'Escape',
  'BracketLeft',
  'BracketRight',
  'Backspace',
].filter(code => code !== 'KeyJ');

export type ChordEvent = {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

const isTextField = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null;
  return (
    !!node &&
    (node.tagName === 'INPUT' ||
      node.tagName === 'TEXTAREA' ||
      !!node.isContentEditable)
  );
};

/**
 * Whether the browser's default for this key press has to be cancelled. Pure,
 * so the tables above can be checked without a DOM.
 */
export function isBrowserChord(e: ChordEvent, typing: boolean): boolean {
  const devtools =
    e.code === 'KeyI' || e.code === 'KeyJ' || e.code === 'KeyC';

  // No page can cancel the devtools chords; claiming to would only hide them.
  if (e.ctrlKey && e.shiftKey && devtools) return false;

  if (e.ctrlKey || e.metaKey) {
    if (CTRL_FATAL_KEYS.has(e.code)) return true;
    if (typing && CTRL_EDIT_KEYS.has(e.code)) return false;
    if (CTRL_KEYS.has(e.code)) return true;
  }

  if (e.altKey && ALT_KEYS.has(e.code)) return !typing;

  if (FUNCTION_KEYS.has(e.code)) return true;

  // Backspace on a page with nothing focused used to mean "back".
  if (e.code === 'Backspace' && !typing && !e.ctrlKey && !e.metaKey) {
    return true;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/* Fullscreen, and the keyboard lock that rides on it                   */
/* ------------------------------------------------------------------ */

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type FullscreenEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

type KeyboardLock = {
  lock?: (codes?: string[]) => Promise<void>;
  unlock?: () => void;
};

const keyboardLock = (): KeyboardLock | undefined =>
  (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard;

export function isFullscreen(): boolean {
  const doc = document as FullscreenDoc;
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/**
 * Enter or leave fullscreen. Has to run inside a user gesture (a key press, a
 * click), which is why nothing calls it on boot: the browser refuses the
 * request otherwise, so there is no way to restore the state silently.
 */
export function toggleFullscreen(): void {
  const doc = document as FullscreenDoc;

  if (isFullscreen()) {
    const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
    exit?.call(doc)?.catch(() => {});
    return;
  }

  const el = document.documentElement as FullscreenEl;
  const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
  request?.call(el)?.catch(() => {});
}

let locked = false;

/**
 * Takes or releases the lock to match the current state. Called on every
 * options change as well as on `fullscreenchange`, so it only acts when the
 * two disagree - a volume slider must not re-take the keyboard.
 */
function applyKeyboardLock(): void {
  const keyboard = keyboardLock();
  if (!keyboard?.lock) return;

  const wanted = isFullscreen() && GameOptions.blockBrowserKeys;
  if (wanted === locked) return;
  locked = wanted;

  if (!wanted) {
    keyboard.unlock?.();
    return;
  }

  // Rejects on a browser that refuses the codes, or if fullscreen was left in
  // between; the preventDefault layer stands on its own either way.
  keyboard.lock([...LOCKED_CODES]).catch(() => {
    locked = false;
  });
}

/* ------------------------------------------------------------------ */
/* Leaving the page                                                     */
/* ------------------------------------------------------------------ */

let unloadAllowed = false;

/**
 * The next navigation is the game's own (Exit Game, a version reload), so it
 * must not raise the "leave site?" prompt.
 */
export function allowUnload(): void {
  unloadAllowed = true;
}

/* ------------------------------------------------------------------ */
/* Install                                                              */
/* ------------------------------------------------------------------ */

let installed = false;

/**
 * Wires all three layers. Called once, from boot.
 *
 * `inSession` says whether losing the page right now would cost the player a
 * live session - the only thing here that has to know about the game's state,
 * and passed in rather than imported so this module stays free of the store.
 */
export function installBrowserHotkeyGuard(inSession: () => boolean): void {
  if (installed) return;
  installed = true;

  // Capture phase, so the default is cancelled even for a chord some window's
  // own handler stops from travelling any further.
  window.addEventListener(
    'keydown',
    ev => {
      if (!GameOptions.blockBrowserKeys) return;
      // A CJK composition owns the keyboard until the syllable is committed.
      if (ev.isComposing || ev.keyCode === 229) return;

      const typing =
        isTextField(ev.target) || isTextField(document.activeElement);

      if (!isBrowserChord(ev, typing)) return;

      ev.preventDefault();

      // F11 is the one of these with something to put in the browser's place:
      // the page's own fullscreen, which is what the keyboard lock needs.
      if (ev.code === 'F11' && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        toggleFullscreen();
      }
    },
    { capture: true }
  );

  document.addEventListener('fullscreenchange', applyKeyboardLock);
  document.addEventListener('webkitfullscreenchange', applyKeyboardLock);

  onGameOptionsChanged(applyKeyboardLock);

  window.addEventListener('beforeunload', ev => {
    if (unloadAllowed) {
      unloadAllowed = false;
      return;
    }
    if (!GameOptions.blockBrowserKeys) return;
    if (!inSession()) return;

    // The wording is the browser's own; every one of them ignores ours.
    ev.preventDefault();
    ev.returnValue = '';
  });
}
