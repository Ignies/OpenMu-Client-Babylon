/** uk text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'Звичайний',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Блокувати шепіт',
  'chat.system': 'Системні повідомлення',
  'chat.log': 'Журнал чату',
  'chat.frame': 'Рамка',
  'chat.size': 'Розмір',
  'chat.alpha': 'Прозорість',
  'chat.whisperOff': 'Шепіт вимкнено (F3)',
  'chat.emoji.button': 'Емодзі',
  'chat.emoji.recent': 'Нещодавні',
  'chat.latest': 'До найновіших повідомлень',
} satisfies Partial<Record<keyof typeof en, string>>;
