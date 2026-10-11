/** Russian text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Группа',
  'party.leader': 'Лидер группы',
  'party.leave': 'Покинуть группу',
  'party.kick': 'Исключить {name}',
  'party.nearby': 'Игроки рядом',
  'party.nearbyEmpty': 'Встаньте рядом с игроком, чтобы пригласить его.',
  'party.tradeWith': 'Обмен с {name}',
  'party.notInParty': 'Вы не в группе.',
  'party.invite': 'Пригласить',
  'party.shop': 'Лавка',
} satisfies Partial<Record<keyof typeof en, string>>;
