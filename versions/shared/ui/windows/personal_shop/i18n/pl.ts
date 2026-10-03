/** Polish text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Sklep osobisty',
  'personalShop.button': 'Sklep',
  'personalShop.selling': 'Twój sklep jest otwarty',
  'personalShop.namePlaceholder': 'Nazwa sklepu',
  'personalShop.openTip': 'Otwórz sklep',
  'personalShop.closeTip': 'Zamknij sklep',
  'personalShop.info1': 'Przed otwarciem ustaw cenę każdego przedmiotu.',
  'personalShop.info2': 'Sklep zamyka się, gdy się ruszysz lub wylogujesz.',
  'personalShop.info3': 'Kupujący muszą stać obok ciebie.',
  'personalShop.info4': 'Wycenionych przedmiotów nie można używać ani wyrzucać.',
  'personalShop.info5': 'Zen trafia prosto do twojego ekwipunku.',
  'personalShop.warn1': 'Nigdy nie sprzedawaj poniżej wartości przedmiotu.',
  'personalShop.warn2': 'Ostatnie słowo w sprawie cen należy do serwera.',
} satisfies Partial<Record<keyof typeof en, string>>;
