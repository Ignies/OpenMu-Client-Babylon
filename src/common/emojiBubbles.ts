/**
 * Emoji bubbles — a small status glyph a character can pop for a couple of
 * seconds. Unlike the emotes in `emotes.ts` these play no animation clip and
 * have no `ServerPlayerActionType`; they are a pure overlay, so they are
 * currently local to whoever triggers them (there is no packet to carry them
 * to the other clients yet).
 *
 * Two placements:
 *
 *  - `head` — floats above the head, just over where the name balloon sits.
 *  - `side` — floats beside the shoulder, on whichever side currently faces
 *    the camera, so it swaps across as the character turns
 *    (`EmojiBubbleSystem` picks the side, `CalculateScreenPositionSystem`
 *    projects it).
 */

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
  label: string;
  glyph: string;
  placement: EmojiBubblePlacement;
  /** Seconds the bubble stays up, fade included. */
  duration: number;
};

const DEFAULT_DURATION = 2.6;

export const EMOJI_BUBBLES: readonly EmojiBubbleDefinition[] = [
  {
    id: 'anger',
    label: 'Anger',
    glyph: '💢',
    placement: 'side',
    duration: DEFAULT_DURATION,
  },
  {
    id: 'love',
    label: 'Love',
    glyph: '❤️',
    placement: 'head',
    duration: DEFAULT_DURATION,
  },
  {
    id: 'sleep',
    label: 'Sleepy',
    glyph: '💤',
    placement: 'head',
    duration: DEFAULT_DURATION,
  },
  {
    id: 'exclaim',
    label: 'Alert',
    glyph: '❗',
    placement: 'head',
    duration: DEFAULT_DURATION,
  },
  {
    id: 'question',
    label: 'Question',
    glyph: '❓',
    placement: 'head',
    duration: DEFAULT_DURATION,
  },
  {
    id: 'interrobang',
    label: 'What?!',
    glyph: '⁉️',
    placement: 'head',
    duration: DEFAULT_DURATION,
  },
  {
    id: 'dizzy',
    label: 'Dizzy',
    glyph: '💫',
    placement: 'head',
    duration: DEFAULT_DURATION,
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
