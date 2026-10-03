/** French text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Normal',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Bloquer les chuchotements',
  'chat.system': 'Messages système',
  'chat.log': 'Journal du chat',
  'chat.frame': 'Cadre',
  'chat.size': 'Taille',
  'chat.alpha': 'Transparence',
  'chat.whisperOff': 'Les chuchotements sont désactivés (F3)',
  'chat.emoji.button': 'Emojis',
  'chat.emoji.recent': 'Utilisés récemment',
  'chat.latest': 'Revenir aux messages les plus récents',
} satisfies Partial<Record<keyof typeof en, string>>;
