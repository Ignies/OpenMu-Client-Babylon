import type { TextKey } from '../i18n';
import { PlayerAction, ServerPlayerActionType } from './objects/enum';

/**
 * The social actions a player can trigger (ZzzInterface.cpp `CheckChatText`).
 * The original had no window for them: each one fired when a matching word
 * (GlobalText 270-348, plus emoticons like `^^` and `T_T`) appeared in chat.
 * `words` is that trigger list, read out of `Text_Eng_decrypted.bmd`; the
 * radial menu and `matchEmoteWord` both use it.
 *
 * The order below is the radial-menu order: the first ring carries the
 * everyday ones, the second the rest. `EMOTE_WORD_CHAIN` keeps the original's
 * `else if` order, which is what decides a word two emotes claim.
 */
export type EmoteId =
  | 'greeting'
  | 'goodbye'
  | 'clap'
  | 'cheer'
  | 'smile'
  | 'cry'
  | 'respect'
  | 'salute'
  | 'gesture'
  | 'direction'
  | 'unknown'
  | 'awkward'
  | 'see'
  | 'win'
  | 'sleep'
  | 'cold'
  | 'again'
  | 'rush'
  | 'scissors'
  | 'rock'
  | 'paper'
  | 'hustle'
  | 'provocation'
  | 'lookAround'
  | 'cheers';

export type EmoteDefinition = {
  id: EmoteId;
  labelKey: TextKey;
  /** Short glyph drawn in the wedge; the label is shown in the hub on hover. */
  glyph: string;
  serverAction: ServerPlayerActionType;
  action: PlayerAction;
  /** Chat triggers from the original (`CheckChatText`), where it had any. */
  words?: string[];
};

const A = PlayerAction;
const S = ServerPlayerActionType;

export const EMOTES: readonly EmoteDefinition[] = [
  // GlobalText 270-277: "Hello" / "Hi" / "Welcome" x2 / "Thanks" x4.
  { id: 'greeting', labelKey: 'emote.greeting', glyph: 'Hi', serverAction: S.Greeting, action: A.PLAYER_GREETING1, words: ['Hello', 'Hi', 'Welcome', 'Thanks'] },
  // 278-280.
  { id: 'goodbye', labelKey: 'emote.goodbye', glyph: 'Bye', serverAction: S.Goodbye, action: A.PLAYER_GOODBYE1, words: ['enjoy the game', 'Bye'] },
  // 281-286.
  { id: 'clap', labelKey: 'emote.clap', glyph: 'Clap', serverAction: S.Clap, action: A.PLAYER_CLAP1, words: ['Good', 'Wow', 'Nice'] },
  // 318-321.
  { id: 'cheer', labelKey: 'emote.cheer', glyph: 'Yay', serverAction: S.Cheer, action: A.PLAYER_CHEER1, words: ['Great', 'Oh Yeah', 'beat it'] },
  // 312-316 plus the emoticons.
  { id: 'smile', labelKey: 'emote.smile', glyph: '^^', serverAction: S.Smile, action: A.PLAYER_SMILE1, words: ['^^', '^.^', '^_^', 'Haha', 'Hehe', 'Hoho', 'Hihi'] },
  // 306-309 plus the emoticons.
  { id: 'cry', labelKey: 'emote.cry', glyph: 'T_T', serverAction: S.Cry, action: A.PLAYER_CRY1, words: ['T_T', 'ㅠ.ㅠ', 'ㅜ.ㅜ', 'Sad', 'Cry'] },
  // 339-341.
  { id: 'respect', labelKey: 'emote.respect', glyph: 'Bow', serverAction: S.Respect, action: A.PLAYER_RESPECT1, words: ['Respect', 'Defeated'] },
  // 342-343 plus the emoticons.
  { id: 'salute', labelKey: 'emote.salute', glyph: 'o7', serverAction: S.Salute, action: A.PLAYER_SALUTE1, words: ['Sir', '/ㅡ', 'ㅡ^'] },
  // 322-325.
  { id: 'win', labelKey: 'emote.win', glyph: 'Win', serverAction: S.Win, action: A.PLAYER_WIN1, words: ['Win', 'Victory'] },

  // 287-290.
  { id: 'gesture', labelKey: 'emote.gesture', glyph: 'Hey', serverAction: S.Gesture, action: A.PLAYER_GESTURE1, words: ['Here', 'Come'] },
  // 292-295.
  { id: 'direction', labelKey: 'emote.direction', glyph: '->', serverAction: S.Direction, action: A.PLAYER_DIRECTION1, words: ['There', 'That'] },
  // 296-302.
  { id: 'unknown', labelKey: 'emote.unknown', glyph: '?', serverAction: S.Unknown, action: A.PLAYER_UNKNOWN1, words: ['Not', 'Never', 'Do not'] },
  // ";" plus 303-305.
  { id: 'awkward', labelKey: 'emote.awkward', glyph: ';', serverAction: S.Awkward, action: A.PLAYER_AWKWARD1, words: [';', 'Sorry'] },
  // 310-311 plus the emoticons.
  { id: 'see', labelKey: 'emote.see', glyph: '-_-', serverAction: S.See, action: A.PLAYER_SEE1, words: ['-.-', '-_-', 'ㅡ.ㅡ', 'ㅡ.,ㅡ', 'ㅡ,.ㅡ', 'Huh', 'Pooh'] },
  // 326-329.
  { id: 'sleep', labelKey: 'emote.sleep', glyph: 'Zzz', serverAction: S.Sleep, action: A.PLAYER_SLEEP1, words: ['Sleep', 'Tired'] },
  // 330-334.
  { id: 'cold', labelKey: 'emote.cold', glyph: 'Brr', serverAction: S.Cold, action: A.PLAYER_COLD1, words: ['Cold', 'hurt'] },
  // 335-338.
  { id: 'again', labelKey: 'emote.again', glyph: 'Agn', serverAction: S.Again, action: A.PLAYER_AGAIN1, words: ['Again', 'OK', 'Great'] },
  // 344-347.
  { id: 'rush', labelKey: 'emote.rush', glyph: 'Go!', serverAction: S.Rush, action: A.PLAYER_RUSH1, words: ['Rush', 'Go go'] },
  // Rock-paper-scissors never had a chat trigger.
  { id: 'scissors', labelKey: 'emote.scissors', glyph: 'Sci', serverAction: S.Scissors, action: A.PLAYER_SCISSORS },
  { id: 'rock', labelKey: 'emote.rock', glyph: 'Rck', serverAction: S.Rock, action: A.PLAYER_ROCK },
  { id: 'paper', labelKey: 'emote.paper', glyph: 'Ppr', serverAction: S.Paper, action: A.PLAYER_PAPER },
  // 783 plus the literal "hustle".
  { id: 'hustle', labelKey: 'emote.hustle', glyph: 'Hus', serverAction: S.Hustle, action: A.PLAYER_HUSTLE, words: ['Hustle'] },
  // 291.
  { id: 'provocation', labelKey: 'emote.provocation', glyph: 'Prv', serverAction: S.Provocation, action: A.PLAYER_PROVOCATION, words: ['come on'] },
  // 348.
  { id: 'lookAround', labelKey: 'emote.lookAround', glyph: 'Look', serverAction: S.LookAround, action: A.PLAYER_LOOK_AROUND, words: ['Look around'] },
  // 317.
  { id: 'cheers', labelKey: 'emote.cheers', glyph: 'Chr', serverAction: S.Cheers, action: A.PLAYER_CHEERS, words: ['Great'] },
];

/** Wedges per ring of the radial menu, innermost first. */
export const EMOTE_RINGS = [9, 16] as const;

export function emoteById(id: EmoteId): EmoteDefinition {
  const def = EMOTES.find(e => e.id === id);
  if (!def) throw new Error(`Unknown emote ${id}`);
  return def;
}

/**
 * `CheckChatText`'s `else if` chain, in its own order - the first branch whose
 * token appears anywhere in the line wins, so a word two emotes claim goes to
 * whichever is checked first. Two of those collisions come straight from the
 * original and are kept: "Great" belongs to `cheer` (318) although `again`
 * (338) and `cheers` (317) list it too, and "There" fires `gesture` because
 * "Here" is a substring of it.
 *
 * **Choice:** `provocation` is moved ahead of `gesture`. The original's
 * `FindText` compares case-sensitively, which is the only reason "come on"
 * (291) was not eaten by "Come" (289); we match case-insensitively - an
 * English player types "hi", not "Hi" - so the one collision that
 * case-sensitivity used to resolve is resolved by the order instead.
 */
export const EMOTE_WORD_CHAIN: readonly EmoteId[] = [
  'provocation',
  'greeting',
  'goodbye',
  'clap',
  'gesture',
  'direction',
  'unknown',
  'awkward',
  'cry',
  'see',
  'smile',
  'cheer',
  'win',
  'sleep',
  'cold',
  'again',
  'respect',
  'salute',
  'rush',
  'hustle',
  'cheers',
  'lookAround',
];

/**
 * `CheckChatText`: the emote a chat line triggers, or null. `FindText` is a
 * plain substring search over the whole line and not a word match, so
 * "Sorry!!" and "I am sorry" both fire `awkward`.
 */
export function matchEmoteWord(text: string): EmoteId | null {
  const line = text.toLowerCase();
  if (!line) return null;

  for (const id of EMOTE_WORD_CHAIN) {
    const words = emoteById(id).words;
    if (!words) continue;
    for (const word of words) {
      if (line.includes(word.toLowerCase())) return id;
    }
  }

  return null;
}

/**
 * Every social clip, male and female variants included
 * (PLAYER_GREETING1 .. PLAYER_COME_UP in the action table). They play once and
 * hand control back to idle, like attacks.
 */
export function isPlayerEmoteAction(action: PlayerAction): boolean {
  return (
    action >= PlayerAction.PLAYER_GREETING1 &&
    action <= PlayerAction.PLAYER_COME_UP
  );
}

/**
 * `SetActionClass`: a female character plays the clip right after the male
 * one, except for the block Respect..Rush which only has one variant.
 */
export function genderedEmoteAction(
  action: PlayerAction,
  isFemale: boolean
): PlayerAction {
  if (!isFemale) return action;
  if (
    action >= PlayerAction.PLAYER_RESPECT1 &&
    action <= PlayerAction.PLAYER_RUSH1
  ) {
    return action;
  }
  if (
    action >= PlayerAction.PLAYER_GREETING1 &&
    action <= PlayerAction.PLAYER_AGAIN1 &&
    (action - PlayerAction.PLAYER_GREETING1) % 2 === 0 // male base clip
  ) {
    return action + 1;
  }
  return action;
}
