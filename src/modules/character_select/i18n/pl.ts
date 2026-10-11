/** Polish text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Wpisz więcej niż 4 litery',
  'characters.create.specialName': 'Nie można używać symboli.',
  'characters.create.reservedName': 'Ta nazwa jest zarezerwowana.',
  'characters.create.failed':
    'Wpisano niepoprawną nazwę postaci lub postać o tej nazwie już istnieje.',
} satisfies Partial<Record<keyof typeof en, string>>;
