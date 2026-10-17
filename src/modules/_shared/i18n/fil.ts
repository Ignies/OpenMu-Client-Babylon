/** fil text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Kailangan ng karakter na level 6 para sa personal na tindahan.',
  'personalShop.openFailed': 'Hindi mabuksan ang tindahan.',
  'personalShop.cannotSell': 'Hindi maibebenta ang item na ito sa tindahan.',
  'personalShop.itemGone': 'Wala na ang item na iyan.',
  'guild.alreadyInGuild': 'Kasapi ka na ng isang guild.',
  'guild.notGuildMaster': 'Hindi guild master ang manlalarong iyan.',
  'guild.requestFailed': 'Nabigo ang kahilingan sa guild.',
  'quest.itemFallback': 'Item {id}',
  'event.shortOfZen': 'Kulang ang iyong Zen.',
  'notify.negativePrice': 'Hindi maaaring negatibo ang presyo',
} satisfies Partial<Record<keyof typeof en, string>>;
