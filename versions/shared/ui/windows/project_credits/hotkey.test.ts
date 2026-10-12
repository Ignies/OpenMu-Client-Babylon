import { describe, expect, it, vi } from 'vitest';
import { installCreditsHotkey, isCreditsChord } from './hotkey';

const key = (code: string, mods: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; metaKey?: boolean } = {}) =>
  Object.assign(new Event('keydown', { cancelable: true }), { code, repeat: false, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

describe('isCreditsChord', () => {
  it('is Ctrl+F8 and nothing else', () => {
    expect(isCreditsChord(key('F8', { ctrlKey: true }))).toBe(true);
    expect(isCreditsChord(key('F8'))).toBe(false);
    expect(isCreditsChord(key('F7', { ctrlKey: true }))).toBe(false);
    expect(isCreditsChord(key('F8', { ctrlKey: true, altKey: true }))).toBe(false);
  });
});

describe('installCreditsHotkey', () => {
  it('toggles on Ctrl+F8, keeps it from the browser and the game keys, and comes off', () => {
    const target = new EventTarget();
    const toggle = vi.fn();
    const game = vi.fn();
    const off = installCreditsHotkey(target, toggle);
    target.addEventListener('keydown', game);

    const press = key('F8', { ctrlKey: true });
    target.dispatchEvent(press);
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(press.defaultPrevented).toBe(true);
    expect(game).not.toHaveBeenCalled();

    target.dispatchEvent(key('F8'));
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(game).toHaveBeenCalledTimes(1);

    off();
    target.dispatchEvent(key('F8', { ctrlKey: true }));
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
