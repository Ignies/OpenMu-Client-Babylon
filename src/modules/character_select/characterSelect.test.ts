import { describe, expect, it } from 'vitest';
import { doubleClicks } from './characterSelect';

// CInput's left button (Input.cpp:131-148): a press within GetDoubleClickTime of a single press is a
// double click, and the press after a double starts over.
describe('doubleClicks', () => {
  it('reads a second press within 500 ms as a double click', () => {
    const isDouble = doubleClicks();
    expect(isDouble(1000)).toBe(false);
    expect(isDouble(1400)).toBe(true);
  });

  it('starts over after a double click', () => {
    const isDouble = doubleClicks();
    isDouble(0);
    isDouble(200);
    expect(isDouble(300)).toBe(false);
    expect(isDouble(500)).toBe(true);
  });

  it('leaves slow presses single', () => {
    const isDouble = doubleClicks();
    isDouble(0);
    expect(isDouble(600)).toBe(false);
    expect(isDouble(1200)).toBe(false);
  });
});
