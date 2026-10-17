/** eu text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Idatzi 4 letra baino gehiago',
  'characters.create.specialName': 'Ezin da ikurrik erabili.',
  'characters.create.reservedName': 'Izen hori erreserbatuta dago.',
  'characters.create.failed':
    'Pertsonaiaren izena okerra da, edo izen bereko pertsonaia bat badago jada.',
} satisfies Partial<Record<keyof typeof en, string>>;
