/** Italian text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'Il negozio personale richiede il livello 6.',
  'personalShop.openFailed': 'Non è stato possibile aprire il negozio.',
  'personalShop.cannotSell':
    'Questo oggetto non si può vendere in un negozio.',
  'personalShop.itemGone': "Quell'oggetto non c'è più.",
  'guild.alreadyInGuild': 'Appartieni già a una gilda.',
  'guild.notGuildMaster': 'Quel giocatore non è master di gilda.',
  'guild.requestFailed': 'La richiesta di gilda è fallita.',
  'quest.itemFallback': 'Oggetto {id}',
  'event.shortOfZen': 'Non hai abbastanza Zen.',
  'notify.negativePrice': 'Il prezzo non può essere negativo',
} satisfies Partial<Record<keyof typeof en, string>>;
