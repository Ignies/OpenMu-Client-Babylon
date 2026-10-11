/** German text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'Ein eigener Laden verlangt Level 6.',
  'personalShop.openFailed': 'Der Laden konnte nicht geöffnet werden.',
  'personalShop.cannotSell':
    'Dieser Gegenstand kann nicht im Laden verkauft werden.',
  'personalShop.itemGone': 'Dieser Gegenstand ist weg.',
  'guild.alreadyInGuild': 'Du gehörst bereits zu einer Gilde.',
  'guild.notGuildMaster': 'Dieser Spieler ist kein Gildenmeister.',
  'guild.requestFailed': 'Die Gildenanfrage ist fehlgeschlagen.',
  'quest.itemFallback': 'Gegenstand {id}',
  'event.shortOfZen': 'Dir fehlt Zen.',
  'notify.negativePrice': 'Der Preis darf nicht negativ sein',
} satisfies Partial<Record<keyof typeof en, string>>;
