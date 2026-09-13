import { CURSOR_HOTSPOT, CURSOR_SIZE } from '../gameCursor/cursors';

const MARGIN = 2;
/** Breathing room between the cursor art and the box. */
const GAP = 4;

// The pointer is drawn by GameCursor, not the OS: a CURSOR_SIZE sprite hanging
// down-right from the hotspot. Anything closer than that is behind the cursor,
// which is what used to swallow the item's name.
export const BELOW_CURSOR = CURSOR_SIZE - CURSOR_HOTSPOT + GAP;
export const ABOVE_CURSOR = CURSOR_HOTSPOT + GAP;

export type Viewport = { width: number; height: number };

export type Placement = { left: number; top: number };

export type BoxSize = { width: number; height: number };

/** The cursor sprite's footprint in viewport pixels (gameCursor/index.tsx). */
function cursorBox(x: number, y: number) {
  const left = x - CURSOR_HOTSPOT;
  const top = y - CURSOR_HOTSPOT;
  return { left, top, right: left + CURSOR_SIZE, bottom: top + CURSOR_SIZE };
}

/**
 * `RenderItemInfo` placement: centred on the cursor's x, hanging clear below
 * the cursor art, flipped above when it would leave the bottom, kept inside
 * the viewport. Pure arithmetic on a measured size so it can run per pointer
 * move without touching layout.
 */
export function place(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: Viewport
): Placement {
  let left = x - width / 2;
  let top = y + BELOW_CURSOR;

  if (left + width > viewport.width - MARGIN) {
    left = viewport.width - MARGIN - width;
  }
  if (left < MARGIN) left = MARGIN;

  if (top + height > viewport.height - MARGIN) {
    top = y - ABOVE_CURSOR - height;
  }
  if (top < MARGIN) top = MARGIN;

  // A box too tall for the room above and below gets clamped back over the
  // cursor: step it aside so the sprite never sits on the text.
  const cursor = cursorBox(x, y);
  if (
    top < cursor.bottom &&
    top + height > cursor.top &&
    left < cursor.right &&
    left + width > cursor.left
  ) {
    left =
      cursor.right + GAP + width <= viewport.width - MARGIN
        ? cursor.right + GAP
        : cursor.left - GAP - width;
    if (left < MARGIN) left = MARGIN;
  }

  return { left: Math.round(left), top: Math.round(top) };
}

function hidesCursor(
  left: number,
  top: number,
  size: BoxSize,
  cursor: ReturnType<typeof cursorBox>
): boolean {
  return (
    top < cursor.bottom &&
    top + size.height > cursor.top &&
    left < cursor.right &&
    left + size.width > cursor.left
  );
}

/**
 * The hovered box where it always goes, and the worn item's box beside it:
 * to its right, mirrored to its left when the right edge is too close, and
 * clamped inside the viewport either way. Neither box lands on the cursor.
 */
export function placePair(
  x: number,
  y: number,
  primary: BoxSize,
  second: BoxSize | null,
  viewport: Viewport
): { primary: Placement; second: Placement | null } {
  const first = place(x, y, primary.width, primary.height, viewport);
  if (!second || second.width === 0) return { primary: first, second: null };

  const rightOf = first.left + primary.width + GAP;
  const leftOf = first.left - GAP - second.width;
  const fitsRight = rightOf + second.width <= viewport.width - MARGIN;
  const fitsLeft = leftOf >= MARGIN;

  let left = fitsRight ? rightOf : fitsLeft ? leftOf : rightOf;

  let top = first.top;
  if (top + second.height > viewport.height - MARGIN) {
    top = viewport.height - MARGIN - second.height;
  }
  if (top < MARGIN) top = MARGIN;

  // Only reachable once one of the boxes was clamped: step to the free side.
  const cursor = cursorBox(x, y);
  if (hidesCursor(left, top, second, cursor)) {
    const other = left === rightOf ? leftOf : rightOf;
    if (!hidesCursor(other, top, second, cursor)) left = other;
  }

  left = Math.max(MARGIN, Math.min(viewport.width - MARGIN - second.width, left));

  return { primary: first, second: { left: Math.round(left), top: Math.round(top) } };
}
