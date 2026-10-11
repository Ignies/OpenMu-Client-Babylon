/** Polish text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'Sklep osobisty wymaga postaci na poziomie 6.',
  'personalShop.openFailed': 'Nie udało się otworzyć sklepu.',
  'personalShop.cannotSell': 'Tego przedmiotu nie można sprzedać w sklepie.',
  'personalShop.itemGone': 'Tego przedmiotu już nie ma.',
  'guild.alreadyInGuild': 'Już należysz do gildii.',
  'guild.notGuildMaster': 'Ten gracz nie jest mistrzem gildii.',
  'guild.requestFailed': 'Prośba gildii nie powiodła się.',
  'quest.itemFallback': 'Przedmiot {id}',
  'event.shortOfZen': 'Brakuje ci Zen.',
  'notify.negativePrice': 'Cena nie może być ujemna',
} satisfies Partial<Record<keyof typeof en, string>>;
