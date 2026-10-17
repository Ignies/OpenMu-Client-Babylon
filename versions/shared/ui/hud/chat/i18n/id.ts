/** id text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'Normal',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Blokir bisikan',
  'chat.system': 'Pesan sistem',
  'chat.log': 'Log chat',
  'chat.frame': 'Bingkai',
  'chat.size': 'Ukuran',
  'chat.alpha': 'Transparansi',
  'chat.whisperOff': 'Bisikan nonaktif (F3)',
  'chat.emoji.button': 'Emoji',
  'chat.emoji.recent': 'Terakhir dipakai',
  'chat.latest': 'Kembali ke pesan terbaru',
} satisfies Partial<Record<keyof typeof en, string>>;
