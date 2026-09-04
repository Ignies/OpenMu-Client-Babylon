import { describe, expect, it } from 'vitest';
import { CURSOR_HOTSPOT, CURSOR_SIZE } from '../gameCursor/cursors';
import { place } from './placement';

const VIEWPORT = { width: 1280, height: 720 };

/** The cursor sprite the tooltip has to stay out of. */
function cursor(x: number, y: number) {
  return {
    left: x - CURSOR_HOTSPOT,
    top: y - CURSOR_HOTSPOT,
    right: x - CURSOR_HOTSPOT + CURSOR_SIZE,
    bottom: y - CURSOR_HOTSPOT + CURSOR_SIZE,
  };
}

function overlapsCursor(
  box: { left: number; top: number },
  size: { width: number; height: number },
  x: number,
  y: number
) {
  const c = cursor(x, y);
  return (
    box.left < c.right &&
    box.left + size.width > c.left &&
    box.top < c.bottom &&
    box.top + size.height > c.top
  );
}

describe('item tooltip placement', () => {
  it('clears the cursor art when it hangs below', () => {
    const size = { width: 120, height: 17 };
    const box = place(400, 300, size.width, size.height, VIEWPORT);

    expect(box.top).toBeGreaterThanOrEqual(cursor(400, 300).bottom);
    expect(overlapsCursor(box, size, 400, 300)).toBe(false);
  });

  it('clears the cursor art when it flips above', () => {
    const size = { width: 120, height: 200 };
    const box = place(400, 700, size.width, size.height, VIEWPORT);

    expect(box.top + size.height).toBeLessThanOrEqual(cursor(400, 700).top);
    expect(overlapsCursor(box, size, 400, 700)).toBe(false);
  });

  it('steps aside when the box fits neither above nor below', () => {
    const size = { width: 120, height: 700 };
    const box = place(400, 700, size.width, size.height, VIEWPORT);

    expect(overlapsCursor(box, size, 400, 700)).toBe(false);
  });

  it('steps to the left when there is no room on the right', () => {
    const size = { width: 120, height: 700 };
    const x = VIEWPORT.width - 20;
    const box = place(x, 700, size.width, size.height, VIEWPORT);

    expect(box.left).toBeLessThan(cursor(x, 700).left);
    expect(overlapsCursor(box, size, x, 700)).toBe(false);
  });

  it('stays inside the viewport', () => {
    const size = { width: 300, height: 120 };

    for (const [x, y] of [
      [0, 0],
      [VIEWPORT.width, 0],
      [0, VIEWPORT.height],
      [VIEWPORT.width, VIEWPORT.height],
      [640, 360],
    ]) {
      const box = place(x, y, size.width, size.height, VIEWPORT);

      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.left + size.width).toBeLessThanOrEqual(VIEWPORT.width);
      expect(box.top + size.height).toBeLessThanOrEqual(VIEWPORT.height);
    }
  });

  it('centres on the cursor while there is room', () => {
    const box = place(640, 300, 120, 60, VIEWPORT);

    expect(box.left).toBe(640 - 60);
  });
});
