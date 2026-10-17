/** fil text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'Karaniwan',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'I-block ang bulong',
  'chat.system': 'Mensahe ng sistema',
  'chat.log': 'Talaan ng chat',
  'chat.frame': 'Frame',
  'chat.size': 'Laki',
  'chat.alpha': 'Linaw',
  'chat.whisperOff': 'Naka-off ang bulong (F3)',
  'chat.emoji.button': 'Mga Emoji',
  'chat.emoji.recent': 'Kamakailang ginamit',
  'chat.latest': 'Bumalik sa pinakabagong mensahe',
} satisfies Partial<Record<keyof typeof en, string>>;
