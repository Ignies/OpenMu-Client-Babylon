/** tr text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Kişisel dükkan için karakter seviyesi 6 gerekir.',
  'personalShop.openFailed': 'Dükkan açılamadı.',
  'personalShop.cannotSell': 'Bu eşya dükkanda satılamaz.',
  'personalShop.itemGone': 'O eşya artık yok.',
  'guild.alreadyInGuild': 'Zaten bir loncaya üyesin.',
  'guild.notGuildMaster': 'Bu oyuncu bir lonca lideri değil.',
  'guild.requestFailed': 'Lonca isteği başarısız oldu.',
  'quest.itemFallback': 'Eşya {id}',
  'event.shortOfZen': 'Zen\'in yetersiz.',
  'notify.negativePrice': 'Fiyat negatif olamaz',
} satisfies Partial<Record<keyof typeof en, string>>;
