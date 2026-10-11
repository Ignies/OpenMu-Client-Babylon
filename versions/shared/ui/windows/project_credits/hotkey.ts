type Chord = { code: string; ctrlKey: boolean; altKey: boolean; metaKey: boolean };

/** Ctrl+F8, the hidden key of the credits window: in no key list, no menu and no help text. */
export const isCreditsChord = (e: Chord): boolean => e.code === 'F8' && e.ctrlKey && !e.altKey && !e.metaKey;

/**
 * Toggles the credits on Ctrl+F8 on every page. Capture phase on `window`: the browser's default
 * is cancelled and the game's key handlers never see it (the GM panel's plain F8 stays its own).
 */
export function installCreditsHotkey(target: EventTarget, toggle: () => void): () => void {
  const onKey = (ev: Event) => {
    const e = ev as KeyboardEvent;
    if (!isCreditsChord(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) toggle();
  };
  target.addEventListener('keydown', onKey, { capture: true });
  return () => target.removeEventListener('keydown', onKey, { capture: true });
}
