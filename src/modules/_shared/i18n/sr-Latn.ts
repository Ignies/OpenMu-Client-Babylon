/** sr-Latn text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Lična prodavnica zahteva nivo lika 6.',
  'personalShop.openFailed': 'Prodavnica ne može da se otvori.',
  'personalShop.cannotSell': 'Ovaj predmet ne može da se prodaje u prodavnici.',
  'personalShop.itemGone': 'Tog predmeta više nema.',
  'guild.alreadyInGuild': 'Već pripadaš gildi.',
  'guild.notGuildMaster': 'Taj igrač nije majstor gilde.',
  'guild.requestFailed': 'Zahtev gilde nije uspeo.',
  'quest.itemFallback': 'Predmet {id}',
  'event.shortOfZen': 'Nemaš dovoljno Zen.',
  'notify.negativePrice': 'Cena ne može biti negativna',
} satisfies Partial<Record<keyof typeof en, string>>;
