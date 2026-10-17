/** uk text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'Група',
  'party.leader': 'Лідер групи',
  'party.leave': 'Покинути групу',
  'party.kick': 'Виключити: {name}',
  'party.nearby': 'Гравці поруч',
  'party.nearbyEmpty': 'Станьте поруч із гравцем, щоб надіслати запрошення.',
  'party.tradeWith': 'Обмін із гравцем {name}',
  'party.notInParty': 'Ви не в групі.',
  'party.invite': 'Запросити',
  'party.shop': 'Крамниця',
} satisfies Partial<Record<keyof typeof en, string>>;
