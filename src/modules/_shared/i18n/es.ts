/** Spanish text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'La tienda personal exige nivel 6.',
  'personalShop.openFailed': 'No se pudo abrir la tienda.',
  'personalShop.cannotSell': 'Este objeto no se puede vender en una tienda.',
  'personalShop.itemGone': 'Ese objeto ya no está.',
  'guild.alreadyInGuild': 'Ya perteneces a un guild.',
  'guild.notGuildMaster': 'Ese jugador no es máster de guild.',
  'guild.requestFailed': 'La solicitud de guild ha fallado.',
  'quest.itemFallback': 'Objeto {id}',
  'event.shortOfZen': 'No tienes suficiente Zen.',
  'notify.negativePrice': 'El precio no puede ser negativo',
} satisfies Partial<Record<keyof typeof en, string>>;
