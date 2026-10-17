/** ca text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Escriu més de 4 lletres',
  'characters.create.specialName': 'No es poden fer servir símbols.',
  'characters.create.reservedName': 'Aquest nom està reservat.',
  'characters.create.failed':
    'El nom de personatge no és vàlid o ja existeix un personatge amb aquest nom.',
} satisfies Partial<Record<keyof typeof en, string>>;
