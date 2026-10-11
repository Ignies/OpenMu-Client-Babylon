import { describe, expect, it } from 'vitest';
import { isBrowserChord, type ChordEvent } from './browserHotkeys';

const chord = (over: Partial<ChordEvent>): ChordEvent => ({
  code: 'KeyA',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...over,
});

const ctrl = (code: string, over: Partial<ChordEvent> = {}) =>
  chord({ code, ctrlKey: true, ...over });

describe('isBrowserChord', () => {
  it('blocks the chords that close or reload the page', () => {
    for (const code of ['KeyW', 'KeyT', 'KeyN', 'KeyR', 'KeyQ']) {
      expect(isBrowserChord(ctrl(code), false)).toBe(true);
      // Even with the chat box open: a reload loses the session either way.
      expect(isBrowserChord(ctrl(code), true)).toBe(true);
    }
  });

  it('blocks save, print, find, bookmark and the zoom keys', () => {
    for (const code of ['KeyS', 'KeyP', 'KeyF', 'KeyD', 'Minus', 'Equal', 'Digit0']) {
      expect(isBrowserChord(ctrl(code), false)).toBe(true);
    }
  });

  it('blocks tab switching and Ctrl+Tab cycling', () => {
    expect(isBrowserChord(ctrl('Tab'), false)).toBe(true);
    expect(isBrowserChord(ctrl('Tab', { shiftKey: true }), false)).toBe(true);
    expect(isBrowserChord(ctrl('Digit5'), false)).toBe(true);
  });

  it('treats Cmd like Ctrl', () => {
    expect(isBrowserChord(chord({ code: 'KeyW', metaKey: true }), false)).toBe(true);
  });

  it('leaves the editing chords alone while a field has the focus', () => {
    for (const code of ['KeyC', 'KeyV', 'KeyX', 'KeyZ', 'KeyA']) {
      expect(isBrowserChord(ctrl(code), true)).toBe(false);
    }
  });

  it('still blocks select-all outside a field', () => {
    expect(isBrowserChord(ctrl('KeyA'), false)).toBe(true);
  });

  it('leaves the devtools chords reachable', () => {
    for (const code of ['KeyI', 'KeyJ', 'KeyC']) {
      expect(isBrowserChord(ctrl(code, { shiftKey: true }), false)).toBe(false);
    }
  });

  it('blocks the function keys but not F12', () => {
    for (const code of ['F1', 'F3', 'F5', 'F6', 'F7', 'F10', 'F11']) {
      expect(isBrowserChord(chord({ code }), false)).toBe(true);
    }
    expect(isBrowserChord(chord({ code: 'F12' }), false)).toBe(false);
  });

  it('blocks history navigation and the address bar', () => {
    expect(isBrowserChord(chord({ code: 'ArrowLeft', altKey: true }), false)).toBe(true);
    expect(isBrowserChord(chord({ code: 'KeyD', altKey: true }), false)).toBe(true);
    // Alt+arrow moves the caret by word in a field.
    expect(isBrowserChord(chord({ code: 'ArrowLeft', altKey: true }), true)).toBe(false);
  });

  it('blocks a bare Backspace only outside a field', () => {
    expect(isBrowserChord(chord({ code: 'Backspace' }), false)).toBe(true);
    expect(isBrowserChord(chord({ code: 'Backspace' }), true)).toBe(false);
  });

  it('lets every plain game key through', () => {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Space', 'Escape', 'Digit1', 'Tab']) {
      expect(isBrowserChord(chord({ code }), false)).toBe(false);
    }
  });
});
