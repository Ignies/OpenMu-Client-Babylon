/** Polish text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Drużyna',
  'party.leader': 'Lider drużyny',
  'party.leave': 'Opuść drużynę',
  'party.kick': 'Wyrzuć: {name}',
  'party.nearby': 'Gracze w pobliżu',
  'party.nearbyEmpty': 'Stań obok gracza, aby go zaprosić.',
  'party.tradeWith': 'Handluj z: {name}',
  'party.notInParty': 'Nie jesteś w drużynie.',
  'party.invite': 'Zaproś',
  'party.shop': 'Sklep',
} satisfies Partial<Record<keyof typeof en, string>>;
