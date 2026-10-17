/** eu text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Denda pertsonala irekitzeko pertsonaiaren 6. maila behar da.',
  'personalShop.openFailed': 'Ezin izan da denda ireki.',
  'personalShop.cannotSell': 'Objektu hau ezin da dendan saldu.',
  'personalShop.itemGone': 'Objektu hori jada ez dago.',
  'guild.alreadyInGuild': 'Dagoeneko gremio batekoa zara.',
  'guild.notGuildMaster': 'Jokalari hori ez da gremio-burua.',
  'guild.requestFailed': 'Gremio-eskaerak huts egin du.',
  'quest.itemFallback': 'Objektua {id}',
  'event.shortOfZen': 'Ez duzu Zen nahikorik.',
  'notify.negativePrice': 'Prezioa ezin da negatiboa izan',
} satisfies Partial<Record<keyof typeof en, string>>;
