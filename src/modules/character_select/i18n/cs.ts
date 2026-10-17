/** cs text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Zadej víc než 4 písmena',
  'characters.create.specialName': 'Symboly nelze použít.',
  'characters.create.reservedName': 'Toto jméno je rezervované.',
  'characters.create.failed':
    'Bylo zadáno neplatné jméno postavy, nebo postava s tímto jménem už existuje.',
} satisfies Partial<Record<keyof typeof en, string>>;
