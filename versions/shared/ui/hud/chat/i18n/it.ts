/** Italian text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Normale',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Blocca i sussurri',
  'chat.system': 'Messaggi di sistema',
  'chat.log': 'Registro della chat',
  'chat.frame': 'Cornice',
  'chat.size': 'Dimensione',
  'chat.alpha': 'Trasparenza',
  'chat.whisperOff': 'I sussurri sono disattivati (F3)',
  'chat.emoji.button': 'Emoji',
  'chat.emoji.recent': 'Usate di recente',
  'chat.latest': 'Torna ai messaggi più recenti',
} satisfies Partial<Record<keyof typeof en, string>>;
