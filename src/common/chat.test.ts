import { describe, expect, it } from 'vitest';
import { CHAT_LOG_CLIENT_WIDTH, splitChatLine } from './chat';

/** A fixed-width face, so the expected break is arithmetic rather than a guess. */
const CHAR = 6;
const measure = (text: string) => text.length * CHAR;

/** How many characters of a senderless line fit on one row. */
const FITS = Math.floor(CHAT_LOG_CLIENT_WIDTH / CHAR);

/** The longest thing OpenMU sends, and the one the log used to cut. */
const LOGIN_WARNING =
  "Another user attempted to login this account. If it wasn't you, we suggest" +
  ' you to change your password.';

describe('splitChatLine', () => {
  it('leaves a line that fits alone', () => {
    expect(splitChatLine('', 'Elfita entered the game.', CHAT_LOG_CLIENT_WIDTH, measure)).toEqual([
      'Elfita entered the game.',
    ]);
  });

  it('never measures a short line', () => {
    expect(splitChatLine('', 'hi there', 0, measure)).toEqual(['hi there']);
  });

  it('keeps all of a long line, breaking at the spaces that fit', () => {
    const rows = splitChatLine('', LOGIN_WARNING, CHAT_LOG_CLIENT_WIDTH, measure);

    expect(rows.length).toBeGreaterThan(2);
    for (const row of rows) {
      expect(measure(row)).toBeLessThanOrEqual(CHAT_LOG_CLIENT_WIDTH);
      expect(row.endsWith(' ')).toBe(false);
    }
    expect(rows.join(' ')).toBe(LOGIN_WARNING);
  });

  it('takes the sender prefix out of the first row only', () => {
    const text = 'a '.repeat(FITS).trim();
    const alone = splitChatLine('', text, CHAT_LOG_CLIENT_WIDTH, measure);
    const named = splitChatLine('Elfita', text, CHAT_LOG_CLIENT_WIDTH, measure);

    expect(named[0].length).toBeLessThan(alone[0].length);
    expect(measure(`Elfita : ${named[0]}`)).toBeLessThanOrEqual(CHAT_LOG_CLIENT_WIDTH);
    expect(measure(named[1])).toBeLessThanOrEqual(CHAT_LOG_CLIENT_WIDTH);
  });

  it('cuts mid-word when one word is wider than the log', () => {
    const text = 'x'.repeat(FITS * 2);
    const rows = splitChatLine('', text, CHAT_LOG_CLIENT_WIDTH, measure);

    expect(measure(rows[0])).toBeLessThanOrEqual(CHAT_LOG_CLIENT_WIDTH);
    expect(rows.join('')).toBe(text);
  });

  it('gives up rather than looping on a width nothing fits in', () => {
    expect(splitChatLine('', 'wwwwwwwwwwwwwwwwwwwwww', 1, measure)).toEqual([
      'wwwwwwwwwwwwwwwwwwwwww',
    ]);
  });
});
