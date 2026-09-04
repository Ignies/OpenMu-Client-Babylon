/**
 * Emoji bubbles — a small status glyph a character can pop for a couple of
 * seconds. Unlike the emotes in `emotes.ts` these play no animation clip and
 * have no `ServerPlayerActionType`, so no packet in the protocol carries one.
 *
 * They travel as public chat instead. Every bubble owns a short ASCII token
 * (`words`) in the spirit of the original's chat emoticons — `^^`, `T_T` and
 * `-_-` all fired social actions through `CheckChatText` — and picking one in
 * the radial menu sends that token as an ordinary chat line. A client that
 * knows the table turns the line back into a bubble over the sender
 * (`matchEmojiBubbleWord`, the ChatMessage handler in logic.ts); one that does
 * not just shows `<3`, which is what a player would have typed anyway.
 *
 * Why chat rather than a synthesised packet like the proxy's weather: the
 * bubble has to reach exactly the players who can see the sender, and the
 * server's chat scope is already that set. The proxy is a per-connection byte
 * pipe with no idea who stands near whom, so relaying there would mean either
 * tracking every viewport or popping hearts over players on another map.
 *
 * Because the token *is* the message, typing `<3` pops the same bubble. The
 * match is on the whole line, so ordinary chat that merely contains `!!`
 * is left alone.
 *
 * Two placements:
 *
 *  - `head` — floats above the head, just over where the name balloon sits.
 *  - `side` — floats beside the shoulder, on whichever side currently faces
 *    the camera, so it swaps across as the character turns
 *    (`EmojiBubbleSystem` picks the side, `CalculateScreenPositionSystem`
 *    projects it).
 */

import type { TextKey } from '../i18n';

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
   * table and must not open with a chat routing prefix (`~ @ $ #`), which
   * `classifyInboundChat` would read as a party / guild / gens / GM line.
   */
  words: [string, ...string[]];
};

const DEFAULT_DURATION = 2.6;

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
    words: ['!!'],
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
    words: ['!?', '?!'],
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
 * too high for a bubble — these bring both placements back down onto the
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
