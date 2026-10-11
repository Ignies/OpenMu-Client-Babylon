/** French text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'L’échoppe personnelle exige le niveau 6.',
  'personalShop.openFailed': 'L’échoppe n’a pas pu être ouverte.',
  'personalShop.cannotSell': 'Cet objet ne peut pas être vendu en échoppe.',
  'personalShop.itemGone': 'Cet objet n’est plus là.',
  'guild.alreadyInGuild': 'Vous appartenez déjà à une guilde.',
  'guild.notGuildMaster': 'Ce joueur n’est pas maître de guilde.',
  'guild.requestFailed': 'La demande de guilde a échoué.',
  'quest.itemFallback': 'Objet {id}',
  'event.shortOfZen': 'Vous n’avez pas assez de Zen.',
  'notify.negativePrice': 'Le prix ne peut pas être négatif',
} satisfies Partial<Record<keyof typeof en, string>>;
