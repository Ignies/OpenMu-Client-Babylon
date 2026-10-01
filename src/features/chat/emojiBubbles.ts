// Emoji bubbles: a glyph popped over a character, sent as a short chat token
// (like the emoticons `CheckChatText` read). Why and how: readme.md.

import type { TextKey } from '../../i18n';

export type EmojiBubbleId =
  | 'anger'
  | 'love'
  | 'sleep'
  | 'exclaim'
  | 'question'
  | 'interrobang'
  | 'dizzy';

export type EmojiBubblePlacement = 'head' | 'side';

export type EmojiBubbleDefinition = {
  id: EmojiBubbleId;
  labelKey: TextKey;
  glyph: string;
  placement: EmojiBubblePlacement;
  /** Seconds the bubble stays up, fade included. */
  duration: number;
  /**
   * The chat spellings that stand for this bubble, ASCII only: packet strings
   * are written one byte per character (`stringToBytes`), so the glyph itself
   * cannot go on the wire. The first entry is what the radial menu sends, the
   * rest are alternatives a player might type. Tokens are unique across the
   * table and may not open with a character the server reads as routing
   * (`RESERVED_CHAT_PREFIXES`) - such a line never comes back as normal chat,
   * so the bubble would show for the sender and for nobody else.
   */
  words: [string, ...string[]];
};

const DEFAULT_DURATION = 2.6;

/**
 * The first characters OpenMU reads as routing instead of speech
 * (`ChatMessageAction._messagePrefixes`): party, guild, alliance, gens,
 * global notification and command. A line opening with one of them is handed
 * to that processor and never reaches the players around the sender - and
 * `!` in particular is dropped outright below game master rank
 * (`ChatMessageGlobalNotificationProcessor`). `#` is not in the list: the
 * server sends it, the client only reads it (`classifyInboundChat`).
 */
export const RESERVED_CHAT_PREFIXES = ['~', '@', '$', '!', '/'] as const;

export const EMOJI_BUBBLES: readonly EmojiBubbleDefinition[] = [
  {
    id: 'anger',
    labelKey: 'emoji.anger',
    glyph: '💢',
    placement: 'side',
    duration: DEFAULT_DURATION,
    words: ['>:(', 'grr'],
  },
  {
    id: 'love',
    labelKey: 'emoji.love',
    glyph: '❤️',
    placement: 'head',
    duration: DEFAULT_DURATION,
    words: ['<3'],
  },
  {
    id: 'sleep',
    labelKey: 'emoji.sleepy',
    glyph: '💤',
    placement: 'head',
    duration: DEFAULT_DURATION,
    words: ['zzz'],
  },
  {
    id: 'exclaim',
    labelKey: 'emoji.alert',
    glyph: '❗',
    placement: 'head',
    duration: DEFAULT_DURATION,
    // `!!` would be the obvious spelling, but `!` is reserved on the wire.
    words: ['(!)'],
  },
  {
    id: 'question',
    labelKey: 'emoji.question',
    glyph: '❓',
    placement: 'head',
    duration: DEFAULT_DURATION,
    words: ['??'],
  },
  {
    id: 'interrobang',
    labelKey: 'emoji.what',
    glyph: '⁉️',
    placement: 'head',
    duration: DEFAULT_DURATION,
    words: ['?!'],
  },
  {
    id: 'dizzy',
    labelKey: 'emoji.dizzy',
    glyph: '💫',
    placement: 'head',
    duration: DEFAULT_DURATION,
    words: ['x_x'],
  },
];

const BY_ID = new Map<EmojiBubbleId, EmojiBubbleDefinition>(
  EMOJI_BUBBLES.map(bubble => [bubble.id, bubble])
);

export function emojiBubbleById(id: EmojiBubbleId): EmojiBubbleDefinition {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown emoji bubble ${id}`);
  return def;
}

/** The token the radial menu puts on the wire for this bubble. */
export function emojiBubbleToken(id: EmojiBubbleId): string {
  return emojiBubbleById(id).words[0];
}

const BY_WORD = new Map<string, EmojiBubbleId>(
  EMOJI_BUBBLES.flatMap(bubble =>
    bubble.words.map(word => [word.toLowerCase(), bubble.id] as const)
  )
);

/**
 * The bubble a chat line stands for, or null.
 *
 * Deliberately not `CheckChatText`'s substring search: an emote fires from a
 * word buried in a sentence because the sentence is the point and the clip is
 * decoration, while a bubble *is* the message. Matching `??` anywhere would
 * hang a question mark over every player who ever asked something, so the
 * whole line has to be the token and nothing else.
 */
export function matchEmojiBubbleWord(text: string): EmojiBubbleId | null {
  return BY_WORD.get(text.trim().toLowerCase()) ?? null;
}

/**
 * Anchor heights as a fraction of the entity's name-balloon height
 * (`screenPosition.worldOffsetZ`, 2.5 tiles for a player). The balloon
 * deliberately floats clear of the head so a name never covers it, which is
 * too high for a bubble - these bring both placements back down onto the
 * character.
 *
 * Both are world-space, so the bubbles keep their distance from the body as
 * the camera zooms, which a fixed pixel offset would not.
 */
export const HEAD_ANCHOR_HEIGHT_RATIO = 0.82;
export const SIDE_ANCHOR_HEIGHT_RATIO = 0.62;

/** How far out from the spine the shoulder anchor sits, in tiles at scale 1. */
export const SIDE_ANCHOR_DISTANCE = 0.22;

/** Seconds of the bubble's life spent fading out at the end. */
export const BUBBLE_FADE_SECONDS = 0.5;
