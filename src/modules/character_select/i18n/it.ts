/** Italian text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Scrivi più di 4 lettere',
  'characters.create.specialName': 'Non si possono usare simboli.',
  'characters.create.reservedName': 'Quel nome è riservato.',
  'characters.create.failed':
    'Nome del personaggio non valido o già esistente.',
} satisfies Partial<Record<keyof typeof en, string>>;
