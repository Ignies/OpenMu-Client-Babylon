/** German text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Gib mehr als 4 Buchstaben ein',
  'characters.create.specialName': 'Sonderzeichen sind nicht erlaubt.',
  'characters.create.reservedName': 'Dieser Name ist reserviert.',
  'characters.create.failed':
    'Ungültiger Charaktername oder der Name ist schon vergeben.',
} satisfies Partial<Record<keyof typeof en, string>>;
