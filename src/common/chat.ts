/**
 * Chat log model - `CNewUIChatLogWindow` (NewUIChatLogWindow.h/.cpp) and the
 * prefix routing of `ReceiveChat` (WSclient.cpp:1435).
 */

import type { TextKey } from '../i18n';

/** `MESSAGE_TYPE` (NewUIChatLogWindow.h:18). */
export enum ChatLineType {
  All = 0,
  Chat,
  Whisper,
  System,
  Error,
  Party,
  Guild,
  Union,
  Gens,
  GM,
}

export type ChatLine = {
  id: number;
  sender: string;
  text: string;
  type: ChatLineType;
};

/** `MAX_NUMBER_OF_LINES` (NewUIChatLogWindow.h:88). */
export const MAX_CHAT_LINES = 200;
/** `MAX_CHAT_SIZE`: the longest line the server accepts. */
export const MAX_CHAT_LENGTH = 60;
/** `CHATBOX_WIDTH` / `CHATBOX_HEIGHT` (NewUIChatInputBox.h:27). */
export const CHATBOX_WIDTH = 281;
export const CHATBOX_HEIGHT = 47;
/** `SCROLL_MIDDLE_PART_HEIGHT`: one log line. */
export const CHAT_LINE_HEIGHT = 15;
/** `m_nShowingLines` default (NewUIChatLogWindow.cpp:29). */
export const CHAT_SHOWING_LINES = 6;
/** `ChatCooldownMs` between two sent lines. */
export const CHAT_COOLDOWN_MS = 500;
/** The original keeps 12 sent lines / whisper targets for the arrow keys. */
export const CHAT_HISTORY_SIZE = 12;
/**
 * A system / error line identical to the previous one within this window is
 * not printed again (`CheckChatRedundancy`, given a clock). The original
 * re-prints every call; here one refused click can otherwise fill the log.
 */
export const SYSTEM_LINE_REPEAT_MS = 1000;

/** What the input box sends: `m_iInputMsgType` (NewUIChatInputBox.cpp:520). */
/** `INPUT_MESSAGE_TYPE`: the four buttons on the left of the input box. */
export type ChatInputMode = 'normal' | 'party' | 'guild' | 'gens';

export const CHAT_INPUT_MODES: ChatInputMode[] = ['normal', 'party', 'guild', 'gens'];

export const CHAT_INPUT_PREFIX: Record<ChatInputMode, string> = {
  normal: '',
  party: '~',
  guild: '@',
  gens: '$',
};

/** `SetNumberOfShowingLines`: 3..15 in steps of three; `SetSizeAuto` cycles. */
export const CHAT_LOG_MIN_LINES = 3;
export const CHAT_LOG_MAX_LINES = 15;
export const CHAT_LOG_LINES_STEP = 3;
/** `m_fBackAlpha`: 0.6 at start, +0.2 per click, wraps from 0.9 to 0.2. */
export const CHAT_LOG_DEFAULT_ALPHA = 0.6;

/**
 * Text / background per type, `RenderMessages` (NewUIChatLogWindow.cpp:108).
 * Alpha is the original's byte over 255.
 */
export const CHAT_LINE_STYLE: Record<
  ChatLineType,
  { color: string; bg: string }
> = {
  [ChatLineType.All]: { color: 'rgb(205,220,239)', bg: 'rgba(0,0,0,0.59)' },
  [ChatLineType.Chat]: { color: 'rgb(205,220,239)', bg: 'rgba(0,0,0,0.59)' },
  [ChatLineType.Whisper]: { color: 'rgb(0,0,0)', bg: 'rgba(255,200,50,0.59)' },
  [ChatLineType.System]: {
    color: 'rgb(100,150,255)',
    bg: 'rgba(0,0,0,0.59)',
  },
  [ChatLineType.Error]: { color: 'rgb(255,30,0)', bg: 'rgba(0,0,0,0.59)' },
  [ChatLineType.Party]: { color: 'rgb(0,0,0)', bg: 'rgba(0,200,255,0.59)' },
  [ChatLineType.Guild]: { color: 'rgb(0,0,0)', bg: 'rgba(0,255,150,0.78)' },
  [ChatLineType.Union]: { color: 'rgb(0,0,0)', bg: 'rgba(200,200,0,0.78)' },
  [ChatLineType.Gens]: { color: 'rgb(0,0,0)', bg: 'rgba(150,200,100,0.78)' },
  [ChatLineType.GM]: { color: 'rgb(250,200,50)', bg: 'rgba(30,30,30,0.78)' },
};

/** The log's filter tabs (`newui_Bt_Chat_*`): which types each one shows. */
export const CHAT_FILTERS: {
  key: 'all' | 'normal' | 'party' | 'guild' | 'system';
  labelKey: TextKey;
  sprite: string;
  types: ChatLineType[] | null;
}[] = [
  { key: 'all', labelKey: 'chat.tab.all', sprite: '', types: null },
  {
    key: 'normal',
    labelKey: 'chat.tab.chat',
    sprite: 'newui_Bt_Chat_normal.OZJ',
    types: [ChatLineType.Chat, ChatLineType.Whisper, ChatLineType.GM],
  },
  {
    key: 'party',
    labelKey: 'chat.party',
    sprite: 'newui_Bt_Chat_party.OZJ',
    types: [ChatLineType.Party],
  },
  {
    key: 'guild',
    labelKey: 'chat.guild',
    sprite: 'newui_Bt_Chat_guild.OZJ',
    types: [ChatLineType.Guild, ChatLineType.Union],
  },
  {
    key: 'system',
    labelKey: 'chat.tab.system',
    sprite: 'newui_Bt_Chat_system.OZJ',
    types: [ChatLineType.System, ChatLineType.Error],
  },
];

export type ChatFilterKey = (typeof CHAT_FILTERS)[number]['key'];

/**
 * `ReceiveChat`: the server sends party / guild / alliance / gens lines as
 * normal chat with a prefix; the prefix picks the log type and is stripped.
 * Returns `balloon: false` for the kinds the original never puts over a head.
 */
export function classifyInboundChat(message: string): {
  type: ChatLineType;
  text: string;
  balloon: boolean;
} {
  if (message.startsWith('~')) {
    return { type: ChatLineType.Party, text: message.slice(1), balloon: false };
  }
  if (message.startsWith('@@')) {
    return { type: ChatLineType.Union, text: message.slice(2), balloon: false };
  }
  if (message.startsWith('@')) {
    return { type: ChatLineType.Guild, text: message.slice(1), balloon: false };
  }
  if (message.startsWith('$')) {
    return { type: ChatLineType.Gens, text: message.slice(1), balloon: false };
  }
  if (message.startsWith('#')) {
    // A GM shout; plain players get it as a (framed) balloon too.
    return { type: ChatLineType.GM, text: message.slice(1), balloon: true };
  }
  return { type: ChatLineType.Chat, text: message, balloon: true };
}

/**
 * Strip the C string padding the packets carry: NUL fill on either side
 * (the generated readers stop at the first NUL, but a field can start with
 * one) and surrounding blanks.
 */
export function cleanName(raw: string): string {
  return raw.replace(/^\0+|\0+$/g, '').trim();
}
