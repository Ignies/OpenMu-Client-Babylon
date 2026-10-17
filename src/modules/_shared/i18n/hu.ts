/** hu text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Saját bolthoz 6. szintű karakter kell.',
  'personalShop.openFailed': 'A boltot nem sikerült megnyitni.',
  'personalShop.cannotSell': 'Ez a tárgy nem adható el boltban.',
  'personalShop.itemGone': 'Ez a tárgy már nincs meg.',
  'guild.alreadyInGuild': 'Már tagja vagy egy céhnek.',
  'guild.notGuildMaster': 'Ez a játékos nem céhmester.',
  'guild.requestFailed': 'A céhkérés sikertelen.',
  'quest.itemFallback': 'Tárgy {id}',
  'event.shortOfZen': 'Nincs elég Zened.',
  'notify.negativePrice': 'Az ár nem lehet negatív',
} satisfies Partial<Record<keyof typeof en, string>>;
