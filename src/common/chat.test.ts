import { describe, expect, it } from 'vitest';
import {
  CHAT_LOG_CLIENT_WIDTH,
  chatPkClass,
  chatSenderPrefix,
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
