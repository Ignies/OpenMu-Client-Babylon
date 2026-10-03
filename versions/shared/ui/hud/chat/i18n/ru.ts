/** Russian text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Обычный',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Блокировать шёпот',
  'chat.system': 'Системные сообщения',
  'chat.log': 'Журнал чата',
  'chat.frame': 'Рамка',
  'chat.size': 'Размер',
  'chat.alpha': 'Прозрачность',
  'chat.whisperOff': 'Шёпот выключен (F3)',
  'chat.emoji.button': 'Эмодзи',
  'chat.emoji.recent': 'Недавние',
  'chat.latest': 'Вернуться к последним сообщениям',
} satisfies Partial<Record<keyof typeof en, string>>;
