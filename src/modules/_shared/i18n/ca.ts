/** ca text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Una botiga personal requereix un personatge de nivell 6.',
  'personalShop.openFailed': 'No s\'ha pogut obrir la botiga.',
  'personalShop.cannotSell': 'Aquest objecte no es pot vendre en una botiga.',
  'personalShop.itemGone': 'Aquest objecte ja no hi és.',
  'guild.alreadyInGuild': 'Ja pertanys a un gremi.',
  'guild.notGuildMaster': 'Aquest jugador no és mestre de gremi.',
  'guild.requestFailed': 'La sol·licitud del gremi ha fallat.',
  'quest.itemFallback': 'Objecte {id}',
  'event.shortOfZen': 'No tens prou Zen.',
  'notify.negativePrice': 'El preu no pot ser negatiu',
} satisfies Partial<Record<keyof typeof en, string>>;
