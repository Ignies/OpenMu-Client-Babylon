/** Romanian text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Normal',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Blochează șoaptele',
  'chat.system': 'Mesaje de sistem',
  'chat.log': 'Jurnalul conversației',
  'chat.frame': 'Ramă',
  'chat.size': 'Mărime',
  'chat.alpha': 'Transparență',
  'chat.whisperOff': 'Șoaptele sunt oprite (F3)',
  'chat.emoji.button': 'Emoji',
  'chat.emoji.recent': 'Folosite recent',
  'chat.latest': 'Înapoi la cele mai noi mesaje',
} satisfies Partial<Record<keyof typeof en, string>>;
