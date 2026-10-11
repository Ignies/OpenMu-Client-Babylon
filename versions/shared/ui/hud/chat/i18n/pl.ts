/** Polish text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Zwykły',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Blokuj szepty',
  'chat.system': 'Komunikaty systemowe',
  'chat.log': 'Dziennik czatu',
  'chat.frame': 'Ramka',
  'chat.size': 'Rozmiar',
  'chat.alpha': 'Przezroczystość',
  'chat.whisperOff': 'Szepty są wyłączone (F3)',
  'chat.emoji.button': 'Emoji',
  'chat.emoji.recent': 'Ostatnio używane',
  'chat.latest': 'Wróć do najnowszych wiadomości',
} satisfies Partial<Record<keyof typeof en, string>>;
