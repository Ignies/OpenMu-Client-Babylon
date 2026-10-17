/** cs text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'Běžný',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Blokovat šepot',
  'chat.system': 'Systémové zprávy',
  'chat.log': 'Historie chatu',
  'chat.frame': 'Rámeček',
  'chat.size': 'Velikost',
  'chat.alpha': 'Průhlednost',
  'chat.whisperOff': 'Šepot je vypnutý (F3)',
  'chat.emoji.button': 'Emoji',
  'chat.emoji.recent': 'Nedávno použité',
  'chat.latest': 'Zpět na nejnovější zprávy',
} satisfies Partial<Record<keyof typeof en, string>>;
