import { describe, expect, it } from 'vitest';
import {
  CHAT_EMOJI_ADVANCE,
  EMOJI_NAME,
  CHAT_EMOJI_SIZES,
  buildEmojiCatalog,
  chatEmojiRowHeight,
  chatEmojiSize,
  chatEmojiBubbleOf,
  emojiPackLabel,
  emojiQueryAt,
  emojiSegments,
  firstUnicodeEmoji,
  matchEmojiCodes,
  pushRecentEmoji,
  spliceChatText,
  splitChatLineWithEmojis,
  stripEmojiCodes,
  type ChatEmoji,
} from './chatEmojis';
import { CHAT_LOG_CLIENT_WIDTH, ChatLineType, MAX_CHAT_LENGTH, classifyInboundChat } from './chat';
import { EMOJI_BUBBLES, RESERVED_CHAT_PREFIXES, matchEmojiBubbleWord } from './emojiBubbles';
import { matchEmoteWord } from './emotes';
import { EMOJI_CATALOG } from '../emojis';

const catalog = buildEmojiCatalog({
  './cats/cat_wave.webp': '/u/cat_wave.webp',
  './cats/cat_love.webp': '/u/cat_love.webp',
  './blobs/blob_cry.webp': '/u/blob_cry.webp',
  './blobs/a.webp': '/u/a.webp',
  './blobs/b.webp': '/u/b.webp',
});

const GRIN = String.fromCodePoint(0x1f600);
const FAMILY = String.fromCodePoint(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467);
const FLAG = String.fromCodePoint(0x1f1ea, 0x1f1f8);

const CHAR = 6;
const measure = (text: string) => text.length * CHAR;
const codes = (segments: ReturnType<typeof emojiSegments>) =>
  segments.map(s => (typeof s === 'string' ? s : `<${s.code}>`));

describe('buildEmojiCatalog', () => {
  it('names each emoji by its file and groups it by its folder, both sorted', () => {
    expect(catalog.packs.map(p => p.id)).toEqual(['blobs', 'cats']);
    expect(catalog.packs[1].emojis.map(e => e.code)).toEqual(['cat_love', 'cat_wave']);
    expect(catalog.byCode.get('cat_wave')).toEqual({
      code: 'cat_wave',
      pack: 'cats',
      url: '/u/cat_wave.webp',
    });
  });

  it('leaves out names chat cannot carry, and a name a pack before it took', () => {
    const odd = buildEmojiCatalog({
      './a/Pepe.webp': '1',
      './a/pe-pe.webp': '2',
      './a/fine.webp': '3',
      './b/fine.webp': '4',
    });
    expect([...odd.byCode.keys()]).toEqual(['fine']);
    expect(odd.byCode.get('fine')?.pack).toBe('a');
    expect(odd.skipped).toEqual(['./a/Pepe.webp', './a/pe-pe.webp', './b/fine.webp']);
  });

  it('labels a pack from its folder', () => {
    expect(emojiPackLabel('dark_knight')).toBe('Dark Knight');
  });
});

describe('emojiSegments', () => {
  it('turns known codes into emojis and leaves the rest as text', () => {
    expect(codes(emojiSegments('hi :cat_wave: and :nope: bye', catalog))).toEqual([
      'hi ',
      '<cat_wave>',
      ' and :nope: bye',
    ]);
  });

  it('reads codes back to back, and a code right after an unknown one', () => {
    expect(codes(emojiSegments(':a::b:', catalog))).toEqual(['<a>', '<b>']);
    expect(codes(emojiSegments(':x:a:', catalog))).toEqual([':x', '<a>']);
  });

  it('ignores case, as a player may type it', () => {
    expect(codes(emojiSegments(':CAT_Wave:', catalog))).toEqual(['<cat_wave>']);
  });
});

describe('stripEmojiCodes', () => {
  it('keeps codes out of the emote words', () => {
    // `blob_cry` holds the cry emote's word.
    expect(matchEmoteWord(':blob_cry:')).toBe('cry');
    expect(stripEmojiCodes(':blob_cry:', catalog)).toBe('');
    expect(matchEmoteWord(stripEmojiCodes('lol :blob_cry:', catalog))).toBeNull();
  });

  it('leaves unknown codes and the words around them', () => {
    expect(stripEmojiCodes('good :cat_love: game :x:', catalog)).toBe('good game :x:');
  });
});

describe('splitChatLineWithEmojis', () => {
  it('never breaks a code in two', () => {
    const line = `${'x'.repeat(40)}:cat_wave:${'y'.repeat(20)}`;
    const rows = splitChatLineWithEmojis('', line, 50 * CHAR, measure, catalog);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.join('')).toBe(line);
    expect(rows.some(r => r.includes(':cat_wave:'))).toBe(true);
  });

  it('measures a code at its picture, not its text', () => {
    // 27 characters, 162 px as text: only the pictures' width fits.
    const line = ':a: '.repeat(7).trim();
    expect(splitChatLineWithEmojis('', line, 7 * CHAT_EMOJI_ADVANCE + 6 * CHAR, measure, catalog))
      .toEqual([line]);
  });

  it('splits a short run of pictures that is too wide anyway', () => {
    const line = ':a::b:'.repeat(4);
    const rows = splitChatLineWithEmojis('', line, 3 * CHAT_EMOJI_ADVANCE, measure, catalog);
    expect(rows.length).toBe(3);
    expect(rows.join('')).toBe(line);
  });

  it('is splitChatLine for a line without codes', () => {
    const line = 'word '.repeat(20).trim();
    const rows = splitChatLineWithEmojis('', line, CHAT_LOG_CLIENT_WIDTH, measure, catalog);
    expect(rows.join(' ')).toBe(line);
  });
});

describe('emojiQueryAt', () => {
  it('finds the code being typed at the caret', () => {
    expect(emojiQueryAt('hello :ca', 9)).toEqual({ start: 6, query: 'ca' });
    expect(emojiQueryAt(':CA', 3)).toEqual({ start: 0, query: 'ca' });
    expect(emojiQueryAt(':a::bl', 6)).toEqual({ start: 3, query: 'bl' });
  });

  it('stays shut for one letter, a clock, and a finished code', () => {
    expect(emojiQueryAt(':c', 2)).toBeNull();
    expect(emojiQueryAt('at 10:30', 8)).toBeNull();
    expect(emojiQueryAt(':cat_wave:', 10)).toBeNull();
    expect(emojiQueryAt(':cat_wave:ab', 12)).toBeNull();
  });

  it('stays shut with the caret inside a code, so Enter sends the line', () => {
    expect(emojiQueryAt('hi :dk_love: there', 6)).toBeNull();
  });
});

describe('matchEmojiCodes', () => {
  it('lists codes that start with the query before codes that hold it', () => {
    const found = matchEmojiCodes('a', catalog, 9).map((e: ChatEmoji) => e.code);
    expect(found).toEqual(['a', 'cat_love', 'cat_wave']);
    expect(matchEmojiCodes('cat', catalog, 1).map(e => e.code)).toEqual(['cat_love']);
  });
});

describe('spliceChatText', () => {
  it('puts the code in place and the caret after it', () => {
    expect(spliceChatText('hi :ca there', 3, 6, ':cat_wave:', 60)).toEqual({
      text: 'hi :cat_wave: there',
      caret: 13,
    });
  });

  it('refuses a code the line has no room for', () => {
    expect(spliceChatText('x'.repeat(55), 55, 55, ':cat_wave:', 60)).toBeNull();
  });
});

describe('pushRecentEmoji', () => {
  it('puts the newest first once, and forgets the oldest', () => {
    expect(pushRecentEmoji(['a', 'b', 'c'], 'b', 3)).toEqual(['b', 'a', 'c']);
    expect(pushRecentEmoji(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});

describe('chatEmojiBubbleOf', () => {
  it('pops a line of only emojis over the head, with no balloon', () => {
    const shown = chatEmojiBubbleOf(':cat_love: :a:', catalog);
    expect(shown.bubble?.emoji).toMatchObject({ code: 'cat_love' });
    expect(shown.balloonText).toBe('');
  });

  it('leaves a line with words to its balloon, emojis and all', () => {
    expect(chatEmojiBubbleOf('gg :cat_wave: all', catalog)).toEqual({
      bubble: null,
      balloonText: 'gg :cat_wave: all',
    });
  });

  it('pops a line of only system emojis, whole sequences included', () => {
    expect(chatEmojiBubbleOf(FAMILY, catalog)).toEqual({
      bubble: { emoji: FAMILY },
      balloonText: '',
    });
    expect(chatEmojiBubbleOf(`${GRIN} :cat_love:`, catalog).bubble?.emoji).toBe(GRIN);
    expect(chatEmojiBubbleOf(`:cat_love: ${GRIN}`, catalog).bubble?.emoji).toMatchObject({
      code: 'cat_love',
    });
  });

  it('leaves a system emoji among words to the balloon', () => {
    expect(chatEmojiBubbleOf(`gg ${GRIN}`, catalog)).toEqual({ bubble: null, balloonText: `gg ${GRIN}` });
    expect(firstUnicodeEmoji(`go ${FLAG}!`)).toEqual({ index: 3, glyph: FLAG });
    expect(firstUnicodeEmoji('10:30 #1')).toBeNull();
  });

  it('leaves a line without emojis alone', () => {
    expect(chatEmojiBubbleOf('hello :nope:', catalog)).toEqual({
      bubble: null,
      balloonText: 'hello :nope:',
    });
  });
});

describe('chatEmojiSize', () => {
  it('keeps the smallest step inside a text row and grows the row for the rest', () => {
    expect(chatEmojiRowHeight(chatEmojiSize(0))).toBe(15);
    expect(chatEmojiRowHeight(chatEmojiSize(2))).toBe(CHAT_EMOJI_SIZES[2] + 2);
    expect(chatEmojiSize(99)).toBe(CHAT_EMOJI_SIZES[CHAT_EMOJI_SIZES.length - 1]);
  });
});

describe('the packs in src/emojis', () => {
  it('has every file named so it becomes a code', () => {
    expect(EMOJI_CATALOG.skipped).toEqual([]);
    expect(EMOJI_CATALOG.byCode.size).toBeGreaterThan(0);
  });

  it('sends every code as plain ASCII that comes back as the same chat line', () => {
    for (const code of EMOJI_CATALOG.byCode.keys()) {
      const token = `:${code}:`;
      expect(EMOJI_NAME.test(code), code).toBe(true);
      expect(/^[\x20-\x7e]+$/.test(token), code).toBe(true);
      expect(token.length).toBeLessThanOrEqual(MAX_CHAT_LENGTH - 1);
      expect(classifyInboundChat(token)).toMatchObject({ type: ChatLineType.Chat, text: token });
    }
    expect(RESERVED_CHAT_PREFIXES).not.toContain(':');
  });

  it('never spells a bubble word', () => {
    const words = EMOJI_BUBBLES.flatMap(b => b.words.map(w => w.toLowerCase()));
    for (const code of EMOJI_CATALOG.byCode.keys()) {
      expect(words).not.toContain(`:${code}:`);
      expect(matchEmojiBubbleWord(`:${code}:`)).toBeNull();
    }
  });
});
