/**
 * Custom chat emojis. Every `.webp` in `src/emojis/<pack>/` is one emoji,
 * named by its file: `dark_knight/dk_love.webp` is `:dk_love:`
 * (`src/emojis/index.ts` finds them when the client is built). An animated
 * webp plays by itself in an `<img>`.
 *
 * They travel as their code, plain ASCII, which every client and the server
 * pass along untouched. A client that has the file draws the picture, one
 * that does not shows the code.
 */

import { CHAT_LINE_HEIGHT, splitChatLine } from './chat';

export type ChatEmoji = { code: string; pack: string; url: string };
export type EmojiPack = { id: string; emojis: ChatEmoji[] };
export type EmojiCatalog = {
  packs: readonly EmojiPack[];
  byCode: ReadonlyMap<string, ChatEmoji>;
  /** Files left out: a name that is not lowercase snake_case, or one another pack already has. */
  skipped: readonly string[];
};

/** What a file stem must look like to become a code. */
export const EMOJI_NAME = /^[a-z0-9_]{1,32}$/;

/** An emoji in a log row fills the row; the advance adds its 1px margins. */
export const CHAT_EMOJI_SIZE = CHAT_LINE_HEIGHT;
export const CHAT_EMOJI_ADVANCE = CHAT_EMOJI_SIZE + 2;

/** Letters typed after a `:` before the completion list opens. */
export const EMOJI_QUERY_MIN = 2;
export const EMOJI_RECENT_MAX = 16;

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** `files` maps a path ending in `<pack>/<name>.webp` to the url it is served at. */
export function buildEmojiCatalog(files: Record<string, string>): EmojiCatalog {
  const entries = Object.entries(files)
    .map(([path, url]) => {
      const parts = path.split('/');
      const pack = parts.length > 1 ? parts[parts.length - 2] : '';
      return { path, url, pack, code: parts[parts.length - 1].replace(/\.webp$/, '') };
    })
    .sort((a, b) => byText(a.pack, b.pack) || byText(a.code, b.code));

  const byCode = new Map<string, ChatEmoji>();
  const packs = new Map<string, ChatEmoji[]>();
  const skipped: string[] = [];

  for (const entry of entries) {
    if (!entry.pack || !EMOJI_NAME.test(entry.code) || byCode.has(entry.code)) {
      skipped.push(entry.path);
      continue;
    }
    const emoji = { code: entry.code, pack: entry.pack, url: entry.url };
    byCode.set(emoji.code, emoji);
    const list = packs.get(emoji.pack);
    if (list) list.push(emoji);
    else packs.set(emoji.pack, [emoji]);
  }

  return { packs: [...packs].map(([id, emojis]) => ({ id, emojis })), byCode, skipped };
}

/** `dark_knight` -> `Dark Knight`. */
export function emojiPackLabel(id: string): string {
  return id
    .split('_')
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

type EmojiHit = { start: number; end: number; emoji: ChatEmoji };

const TOKEN = /:([A-Za-z0-9_]{1,32})(?=:)/g;

/**
 * Every known code in the line. An unknown `:word:` is left as text, and its
 * closing colon may still open the next code.
 */
function scanEmojis(text: string, catalog: EmojiCatalog): EmojiHit[] {
  const hits: EmojiHit[] = [];
  if (!catalog.byCode.size || !text.includes(':')) return hits;

  const token = new RegExp(TOKEN.source, 'g');
  for (let m = token.exec(text); m; m = token.exec(text)) {
    const emoji = catalog.byCode.get(m[1].toLowerCase());
    if (!emoji) continue;
    const end = m.index + m[0].length + 1;
    hits.push({ start: m.index, end, emoji });
    token.lastIndex = end;
  }
  return hits;
}

export type EmojiSegment = string | ChatEmoji;

/** The line as runs of text and emojis, in order. */
export function emojiSegments(text: string, catalog: EmojiCatalog): EmojiSegment[] {
  const hits = scanEmojis(text, catalog);
  if (!hits.length) return [text];

  const segments: EmojiSegment[] = [];
  let at = 0;
  for (const hit of hits) {
    if (hit.start > at) segments.push(text.slice(at, hit.start));
    segments.push(hit.emoji);
    at = hit.end;
  }
  if (at < text.length) segments.push(text.slice(at));
  return segments;
}

/**
 * The line without its codes, for the word matches that fire emotes and
 * bubbles: `:dk_cry:` would play the cry emote.
 */
export function stripEmojiCodes(text: string, catalog: EmojiCatalog): string {
  const hits = scanEmojis(text, catalog);
  if (!hits.length) return text;

  let out = '';
  let at = 0;
  for (const hit of hits) {
    out += `${text.slice(at, hit.start)} `;
    at = hit.end;
  }
  return (out + text.slice(at)).replace(/\s+/g, ' ').trim();
}

const GLYPH_BASE = 0xe000;
const GLYPH_LAST = 0xf8ff;
const GLYPHS = /[\ue000-\uf8ff]/g;

/**
 * `splitChatLine` for a line that may hold codes. Each code is swapped for one
 * private-use character while the line is split, so a code is never broken in
 * two and is measured at the picture's width instead of its text's.
 */
export function splitChatLineWithEmojis(
  prefix: string,
  text: string,
  width: number,
  measure: (text: string) => number,
  catalog: EmojiCatalog,
  advance = CHAT_EMOJI_ADVANCE
): string[] {
  const hits = scanEmojis(text, catalog);
  if (!hits.length || /[\ue000-\uf8ff]/.test(text) || hits.length > GLYPH_LAST - GLYPH_BASE) {
    return splitChatLine(prefix, text, width, measure);
  }

  const codes: string[] = [];
  let packed = '';
  let at = 0;
  for (const hit of hits) {
    packed += text.slice(at, hit.start) + String.fromCharCode(GLYPH_BASE + codes.length);
    codes.push(text.slice(hit.start, hit.end));
    at = hit.end;
  }
  packed += text.slice(at);

  const measurePacked = (part: string) => {
    let pictures = 0;
    const plain = part.replace(GLYPHS, () => {
      pictures++;
      return '';
    });
    return (plain ? measure(plain) : 0) + pictures * advance;
  };

  // Every line with a code is measured: a short run of pictures is wider than its length says.
  return splitChatLine(prefix, packed, width, measurePacked, 0).map(row =>
    row.replace(GLYPHS, glyph => codes[glyph.charCodeAt(0) - GLYPH_BASE])
  );
}

/** The `:partial` code being typed at the caret, or null. */
export function emojiQueryAt(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const word = /[A-Za-z0-9_]/;
  let i = caret;
  while (i > 0 && word.test(text[i - 1])) i--;
  if (i === 0 || text[i - 1] !== ':') return null;
  const start = i - 1;
  // `10:30` or the closing colon of a code already typed.
  if (start > 0 && word.test(text[start - 1])) return null;
  const query = text.slice(i, caret);
  if (query.length < EMOJI_QUERY_MIN) return null;
  return { start, query: query.toLowerCase() };
}

/** Codes that start with the query first, then codes that contain it. */
export function matchEmojiCodes(
  query: string,
  catalog: EmojiCatalog,
  limit: number
): ChatEmoji[] {
  const q = query.toLowerCase();
  const starts: ChatEmoji[] = [];
  const contains: ChatEmoji[] = [];
  for (const emoji of catalog.byCode.values()) {
    if (emoji.code.startsWith(q)) starts.push(emoji);
    else if (emoji.code.includes(q)) contains.push(emoji);
  }
  return starts.concat(contains).slice(0, limit);
}

/**
 * `insert` in place of `text[from, to)`, or null when the result would not fit
 * the line: a code cut short would reach everyone as text.
 */
export function spliceChatText(
  text: string,
  from: number,
  to: number,
  insert: string,
  budget: number
): { text: string; caret: number } | null {
  const next = text.slice(0, from) + insert + text.slice(to);
  if (next.length > budget) return null;
  return { text: next, caret: from + insert.length };
}

/**
 * An emoji typed with the system picker (Win + .), ZWJ families, flags and
 * skin tones whole. Built at run time: a browser without the `v` flag falls
 * back to single pictographs instead of failing to load the module.
 */
function unicodeEmojiPattern(): RegExp {
  try {
    return new RegExp('\\p{RGI_Emoji}', 'gv');
  } catch {
    return new RegExp('\\p{Extended_Pictographic}', 'gu');
  }
}

const UNICODE_EMOJI = unicodeEmojiPattern();

/** The first system emoji in the line and where it starts, or null. */
export function firstUnicodeEmoji(text: string): { index: number; glyph: string } | null {
  UNICODE_EMOJI.lastIndex = 0;
  const m = UNICODE_EMOJI.exec(text);
  UNICODE_EMOJI.lastIndex = 0;
  return m ? { index: m.index, glyph: m[0] } : null;
}

/**
 * A chat emoji popped over its speaker: a pack picture, or a system emoji's
 * glyph. `side` rides the shoulder, clear of a text balloon.
 */
export type ChatEmojiBubble = { emoji: ChatEmoji | string; side: boolean };

/** Seconds a chat emoji stays over its speaker, fade included. */
export const CHAT_EMOJI_BUBBLE_SECONDS = 3.5;

/**
 * What a public line shows over its speaker. A line of nothing but emojis
 * pops the first one over the head and leaves no balloon, the way a bubble
 * word does (`emojiBubbles.ts`). A line with words keeps its balloon, less the
 * codes it cannot draw, and pops the first pack emoji on the shoulder beside
 * it; a system emoji among words is already drawn in the balloon.
 */
export function chatEmojiBubbleOf(
  text: string,
  catalog: EmojiCatalog
): { bubble: ChatEmojiBubble | null; balloonText: string } {
  const segments = emojiSegments(text, catalog);
  const pictureAt = segments.findIndex(s => typeof s !== 'string');
  const picture = pictureAt < 0 ? null : (segments[pictureAt] as ChatEmoji);
  const unicode = firstUnicodeEmoji(text);

  const words = segments
    .filter((s): s is string => typeof s === 'string')
    .join(' ')
    .replace(UNICODE_EMOJI, ' ')
    .trim();

  if (!words && (picture || unicode)) {
    // Where the picture's code starts: the text in front of it.
    const pictureIndex = picture
      ? segments.slice(0, pictureAt).reduce((n, s) => n + (s as string).length, 0)
      : Infinity;
    const first = unicode && unicode.index < pictureIndex ? unicode.glyph : picture!;
    return { bubble: { emoji: first, side: false }, balloonText: '' };
  }
  if (!picture) return { bubble: null, balloonText: text };
  return { bubble: { emoji: picture, side: true }, balloonText: stripEmojiCodes(text, catalog) };
}

/** Most recent first, no repeats. */
export function pushRecentEmoji(
  list: readonly string[],
  code: string,
  max = EMOJI_RECENT_MAX
): string[] {
  return [code, ...list.filter(c => c !== code)].slice(0, max);
}
