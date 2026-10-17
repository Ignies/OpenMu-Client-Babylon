/** id text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Toko pribadi memerlukan karakter level 6.',
  'personalShop.openFailed': 'Toko tidak dapat dibuka.',
  'personalShop.cannotSell': 'Item ini tidak dapat dijual di toko.',
  'personalShop.itemGone': 'Item itu sudah tidak ada.',
  'guild.alreadyInGuild': 'Kamu sudah tergabung dalam guild.',
  'guild.notGuildMaster': 'Pemain itu bukan Ketua Guild.',
  'guild.requestFailed': 'Permintaan guild gagal.',
  'quest.itemFallback': 'Item {id}',
  'event.shortOfZen': 'Zen-mu kurang.',
  'notify.negativePrice': 'Harga tidak boleh negatif',
} satisfies Partial<Record<keyof typeof en, string>>;
