/** hu text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'Normál',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Suttogás tiltása',
  'chat.system': 'Rendszerüzenetek',
  'chat.log': 'Csevegésnapló',
  'chat.frame': 'Keret',
  'chat.size': 'Méret',
  'chat.alpha': 'Átlátszóság',
  'chat.whisperOff': 'A suttogás ki van kapcsolva (F3)',
  'chat.emoji.button': 'Emojik',
  'chat.emoji.recent': 'Nemrég használt',
  'chat.latest': 'Vissza a legújabb üzenetekhez',
} satisfies Partial<Record<keyof typeof en, string>>;
