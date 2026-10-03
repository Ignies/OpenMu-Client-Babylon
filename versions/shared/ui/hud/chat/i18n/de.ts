/** German text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Normal',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Flüstern blockieren',
  'chat.system': 'Systemnachrichten',
  'chat.log': 'Chatprotokoll',
  'chat.frame': 'Rahmen',
  'chat.size': 'Größe',
  'chat.alpha': 'Transparenz',
  'chat.whisperOff': 'Flüstern ist aus (F3)',
  'chat.emoji.button': 'Emojis',
  'chat.emoji.recent': 'Zuletzt verwendet',
  'chat.latest': 'Zurück zu den neuesten Nachrichten',
} satisfies Partial<Record<keyof typeof en, string>>;
