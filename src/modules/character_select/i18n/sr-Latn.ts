/** sr-Latn text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Unesi više od 4 slova',
  'characters.create.specialName': 'Simboli nisu dozvoljeni.',
  'characters.create.reservedName': 'To ime je rezervisano.',
  'characters.create.failed': 'Uneto je neispravno ime lika ili lik sa tim imenom već postoji.',
} satisfies Partial<Record<keyof typeof en, string>>;
