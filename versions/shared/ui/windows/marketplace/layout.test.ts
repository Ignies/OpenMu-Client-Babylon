import { describe, expect, it } from 'vitest';
import { closeButtonSize } from './layout';

// The window scales as one piece; a phone shrinks it to a third, and its 20 px close went with it.
describe('closeButtonSize', () => {
  it('keeps the desktop button as it was at any scale', () => {
    for (const scale of [0.35, 1, 2]) expect(closeButtonSize(scale, false)).toBe(20);
  });

  it('is at least 40 px on a phone screen however small the window is', () => {
    for (const scale of [0.3, 0.35, 0.5, 1]) expect(closeButtonSize(scale, true) * scale).toBeGreaterThanOrEqual(40);
    expect(closeButtonSize(3, true)).toBe(20);
  });
});
