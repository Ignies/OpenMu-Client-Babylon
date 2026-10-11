/** Bulgarian text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Обикновен',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Блокирай шепота',
  'chat.system': 'Системни съобщения',
  'chat.log': 'Дневник на чата',
  'chat.frame': 'Рамка',
  'chat.size': 'Размер',
  'chat.alpha': 'Прозрачност',
  'chat.whisperOff': 'Шепотът е изключен (F3)',
  'chat.emoji.button': 'Емоджи',
  'chat.emoji.recent': 'Последно използвани',
  'chat.latest': 'Към най-новите съобщения',
} satisfies Partial<Record<keyof typeof en, string>>;
