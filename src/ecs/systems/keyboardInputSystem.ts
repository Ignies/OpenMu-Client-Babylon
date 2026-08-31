import { EventBus } from '../../libs/eventBus';
import { Store } from '../../store';
import { isCapturingKey, isKey } from '../../common/keyBindings';
import { MuWindows } from '../../ui/components/muWindow/windowState';
import type { ISystemFactory } from '../world';

/** Keys the page would scroll on; kept from doing so while playing. */
const PAGE_SCROLL_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown']);

const isTextField = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null;
  return (
    !!node &&
    (node.tagName === 'INPUT' ||
      node.tagName === 'TEXTAREA' ||
      !!node.isContentEditable)
  );
};

/** The focused element takes characters, so nothing here is a hot key. */
export const isTypingInField = (): boolean => isTextField(document.activeElement);

/**
 * The one keyboard dispatcher. Every keydown goes through here before any
 * window sees it, in the original's order (`NewUIManager::UpdateKeyEvent`):
 * a focused text field first, then the modal message box, then the topmost
 * window for Escape, and only then the `keyPressed` broadcast the hot keys
 * listen to.
 */
export const KeyboardInputSystem: ISystemFactory = world => {
  const pressedKeys = new Set<string>();

  document.addEventListener('keydown', e => {
    // A CJK composition in progress: the syllable is not committed yet, and
    // Enter / Escape belong to the IME (229 is the legacy IME keyCode).
    if (e.isComposing || e.keyCode === 229) return;

    // The event's own target as well as the focus: React flushes a field's
    // unmount synchronously inside the keydown (Escape closes the chat box),
    // so by the time this runs the focus is already back on the body.
    const typing = isTextField(e.target) || isTypingInField();
    if (!typing) {
      // Tab opens the minimap by default; keep it from cycling browser focus
      // while playing. Text fields keep the normal behaviour.
      if (e.code === 'Tab') e.preventDefault();
      // ALT shows drop names (and the original's macro chord); in a browser a
      // bare ALT moves focus to the menu bar and eats the next click. A text
      // field keeps it (Alt+Gr characters, Alt+arrow caret moves).
      if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();
      // Space / arrows scroll the page; a field needs them as characters and
      // caret keys.
      if (PAGE_SCROLL_KEYS.has(e.code)) e.preventDefault();
    }
    // The Options window is waiting for a key to rebind: it reads the key
    // itself, nothing else should react to it.
    if (isCapturingKey()) return;
    // Typing in the chat box (or any field) is not a hot key: the original
    // routes keys to the focused input first. That includes Escape - the
    // field closes itself (chat, prompts) rather than the windows behind it.
    if (typing) return;
    // `CMsgWin` is modal: while it is up it owns Enter and Escape.
    if (Store.msgWin) return;
    // `NewUIHotKey.cpp:131`: while the minimap sheet is up only its own key
    // (and Escape, which closes it) get through to the windows.
    if (Store.minimapEnabled) {
      if (!isKey('minimap', e.code) && e.code !== 'Escape') return;
    } else if (e.code === 'Escape' && !pressedKeys.has('Escape')) {
      // Escape closes the top window only. A window without a closer of its
      // own leaves it to the broadcast below (every legacy handler closes).
      if (MuWindows.closeTop()) {
        pressedKeys.add(e.code);
        return;
      }
    }
    if (!pressedKeys.has(e.code)) {
      EventBus.emit('keyPressed', e.code);
    }
    pressedKeys.add(e.code);
  });

  document.addEventListener('keyup', e => {
    if (pressedKeys.has(e.code)) {
      EventBus.emit('keyReleased', e.code);
    }
    pressedKeys.delete(e.code);
  });

  const clear = () => {
    pressedKeys.forEach(code => {
      EventBus.emit('keyReleased', code);
    });

    pressedKeys.clear();
  };

  EventBus.on('pageVisibilityChanged', visible => {
    if (visible) return;
    clear();
  });

  window.addEventListener('blur', () => {
    clear();
  });

  const keyboardInput = world.keyboardInput;

  return {
    update: () => {
      keyboardInput.pressedKeys = pressedKeys;
    },
  };
};
