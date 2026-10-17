/** hu text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Írj be 4 betűnél többet',
  'characters.create.specialName': 'Szimbólumok nem használhatók.',
  'characters.create.reservedName': 'Ez a név le van foglalva.',
  'characters.create.failed':
    'Hibás karakternevet adtál meg, vagy már létezik ilyen nevű karakter.',
} satisfies Partial<Record<keyof typeof en, string>>;
