import { CHAT_LINE_FONT_SIZE } from './chat';

/**
 * How wide a chat line would be drawn, in the log's own pixels.
 *
 * The log splits a long line when it is added, not when it is drawn
 * (`ProcessAddText`), so the width has to be known outside React and before
 * anything is on screen. A detached canvas measures in the same font the log
 * paints with; without a DOM (tests, the packet decoder under bun) it falls
 * back to an average character width, which only has to be close enough to
 * pick a space to break at.
 */

/** Tahoma at the log's size: measured average, good to a few percent. */
const FALLBACK_CHAR_WIDTH = 5.4;

let context: CanvasRenderingContext2D | null | undefined;

function measuringContext(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context;

  try {
    const canvas = document.createElement('canvas');
    const own = canvas.getContext('2d');
    if (own) {
      // The family the log resolves to, rather than the stack: `--mu-script-font`
      // is whatever `i18n` set for the language on screen.
      const root = getComputedStyle(document.documentElement);
      const script = root.getPropertyValue('--mu-script-font').trim();
      own.font = `${CHAT_LINE_FONT_SIZE}px ${script || 'Tahoma'}, Tahoma, sans-serif`;
    }
    context = own;
  } catch {
    context = null;
  }

  return context;
}

export function chatTextWidth(text: string): number {
  const own = measuringContext();
  if (!own) return text.length * FALLBACK_CHAR_WIDTH;
  return own.measureText(text).width;
}

/** The language changed, so the face the log paints with may have too. */
export function resetChatTextWidth(): void {
  context = undefined;
}
