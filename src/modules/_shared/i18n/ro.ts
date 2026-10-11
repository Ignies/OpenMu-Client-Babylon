/** Romanian text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'Magazinul personal cere nivelul 6.',
  'personalShop.openFailed': 'Magazinul nu a putut fi deschis.',
  'personalShop.cannotSell':
    'Acest obiect nu poate fi vândut într-un magazin.',
  'personalShop.itemGone': 'Acel obiect nu mai este.',
  'guild.alreadyInGuild': 'Faci deja parte dintr-un guild.',
  'guild.notGuildMaster': 'Acel jucător nu este maestru de guild.',
  'guild.requestFailed': 'Cererea de guild a eșuat.',
  'quest.itemFallback': 'Obiect {id}',
  'event.shortOfZen': 'Nu ai destul Zen.',
  'notify.negativePrice': 'Prețul nu poate fi negativ',
} satisfies Partial<Record<keyof typeof en, string>>;
