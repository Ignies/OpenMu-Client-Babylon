import { describe, expect, it } from 'vitest';
import {
  CHAT_LOG_CLIENT_WIDTH,
  MAX_CHAT_LENGTH,
  chatEndIndex,
  chatInputBudget,
  chatPkClass,
  chatSenderPrefix,
  chatWheelRows,
  joinCopiedRows,
  layoutChatRows,
  scrollChatEnd,
  splitChatLine,
} from './chat';

/** A fixed-width face, so the expected break is arithmetic rather than a guess. */
const CHAR = 6;
const measure = (text: string) => text.length * CHAR;

/** How many characters of a prefixless line fit on one row. */
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

  it('takes the prefix out of the first row only', () => {
    const text = 'a '.repeat(FITS).trim();
    const prefix = chatSenderPrefix({ sender: 'Elfita' });
    const alone = splitChatLine('', text, CHAT_LOG_CLIENT_WIDTH, measure);
    const named = splitChatLine(prefix, text, CHAT_LOG_CLIENT_WIDTH, measure);

    expect(named[0].length).toBeLessThan(alone[0].length);
    expect(measure(prefix + named[0])).toBeLessThanOrEqual(CHAT_LOG_CLIENT_WIDTH);
    expect(measure(named[1])).toBeLessThanOrEqual(CHAT_LOG_CLIENT_WIDTH);
  });

  it('charges the guild tag to the first row as well', () => {
    const text = 'a '.repeat(FITS).trim();
    const bare = chatSenderPrefix({ sender: 'Elfita' });
    const tagged = chatSenderPrefix({ sender: 'Elfita', senderGuild: 'Ignies' });

    const plain = splitChatLine(bare, text, CHAT_LOG_CLIENT_WIDTH, measure);
    const withTag = splitChatLine(tagged, text, CHAT_LOG_CLIENT_WIDTH, measure);

    expect(withTag[0].length).toBeLessThan(plain[0].length);
    expect(measure(tagged + withTag[0])).toBeLessThanOrEqual(CHAT_LOG_CLIENT_WIDTH);
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

describe('chatSenderPrefix', () => {
  it('is empty without a sender', () => {
    expect(chatSenderPrefix({ sender: '' })).toBe('');
  });

  it('puts the guild tag in front of the name', () => {
    expect(chatSenderPrefix({ sender: 'Elfita', senderGuild: 'Ignies' })).toBe(
      '[Ignies] Elfita : '
    );
  });

  it('leaves the tag out when the speaker has no guild', () => {
    expect(chatSenderPrefix({ sender: 'Elfita' })).toBe('Elfita : ');
  });
});

describe('chatPkClass', () => {
  it('does not read a new character as an outlaw', () => {
    expect(chatPkClass(0)).toBe('pk-new');
  });

  it('has a class for every hero and outlaw level', () => {
    expect(chatPkClass(1)).toBe('pk-hero2');
    expect(chatPkClass(2)).toBe('pk-hero1');
    expect(chatPkClass(3)).toBe('pk-neutral');
    expect(chatPkClass(4)).toBe('pk-caution');
    expect(chatPkClass(5)).toBe('pk-murderer1');
    expect(chatPkClass(6)).toBe('pk-murderer2');
  });

  it('keeps the murderer colour above the last level, as the original does', () => {
    expect(chatPkClass(7)).toBe('pk-murderer2');
    expect(chatPkClass(9)).toBe('pk-murderer2');
  });

  it('says nothing for a speaker whose state never arrived', () => {
    expect(chatPkClass(undefined)).toBe('');
  });
});

describe('splitChatLine minLength', () => {
  it('measures a short line when told to', () => {
    expect(splitChatLine('', 'abcdef', 3 * CHAR, measure, 0)).toEqual(['abc', 'def']);
  });
});

const rows = (...ids: number[]) => ids.map(id => ({ id }));

describe('scrollChatEnd', () => {
  const lines = rows(10, 11, 12, 13, 14, 15, 16, 17);

  it('pins the row it scrolled to and follows again at the bottom', () => {
    expect(scrollChatEnd(lines, null, 3, -2)).toBe(15);
    expect(scrollChatEnd(lines, 15, 3, 1)).toBe(16);
    expect(scrollChatEnd(lines, 16, 3, 5)).toBeNull();
  });

  it('keeps a full page in view at the top', () => {
    expect(scrollChatEnd(lines, null, 3, -100)).toBe(12);
  });

  it('follows when everything fits', () => {
    expect(scrollChatEnd(rows(1, 2), null, 3, -1)).toBeNull();
  });

  it('follows the newest when the pinned row is gone', () => {
    expect(chatEndIndex(lines, 99)).toBe(7);
    expect(chatEndIndex(lines, 12)).toBe(2);
  });
});

describe('chatWheelRows', () => {
  it('moves two rows a notch and adds up small touchpad steps', () => {
    expect(chatWheelRows(100, 0, 0, 6)).toEqual({ rows: 2, carry: 0 });
    const first = chatWheelRows(30, 0, 0, 6);
    expect(first.rows).toBe(0);
    expect(chatWheelRows(30, 0, first.carry, 6).rows).toBe(1);
  });

  it('drops what was carried the other way', () => {
    expect(chatWheelRows(-30, 0, 40, 6)).toEqual({ rows: 0, carry: -30 });
  });

  it('reads line and page deltas', () => {
    expect(chatWheelRows(3, 1, 0, 6).rows).toBe(2);
    expect(chatWheelRows(-1, 2, 0, 6).rows).toBe(-6);
  });
});

describe('joinCopiedRows', () => {
  it('puts a wrapped message back on one line and the next message on its own', () => {
    expect(
      joinCopiedRows([
        { messageId: 1, text: 'Elf : a long ' },
        { messageId: 1, text: 'message' },
        { messageId: 3, text: 'Dk : hi' },
        { messageId: 4, text: '  ' },
      ])
    ).toBe('Elf : a long message\nDk : hi');
  });
});

describe('chatInputBudget', () => {
  it('leaves room for the prefix sendChat puts in front', () => {
    expect(chatInputBudget('')).toBe(MAX_CHAT_LENGTH);
    expect(chatInputBudget('~')).toBe(MAX_CHAT_LENGTH - 1);
  });
});

describe('layoutChatRows', () => {
  const text = () => 15;

  it('is the classic layout when every row is text', () => {
    expect(layoutChatRows(text, 9, 15 * 6)).toEqual({ start: 4, tops: [0, 15, 30, 45, 60, 75] });
    // Fewer rows than the log holds sit at its bottom.
    expect(layoutChatRows(text, 1, 15 * 6)).toEqual({ start: 0, tops: [60, 75] });
  });

  it('shows fewer rows when some hold a big emoji', () => {
    const tall = (i: number) => (i === 8 ? 28 : 15);
    expect(layoutChatRows(tall, 9, 15 * 6)).toEqual({ start: 5, tops: [2, 17, 32, 47, 75] });
  });

  it('always shows the newest row, even one taller than the log', () => {
    expect(layoutChatRows(() => 40, 3, 30)).toEqual({ start: 3, tops: [-10] });
  });
});
