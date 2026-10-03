/** Romanian text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Scrie mai mult de 4 litere',
  'characters.create.specialName': 'Simbolurile nu sunt permise.',
  'characters.create.reservedName': 'Acest nume este rezervat.',
  'characters.create.failed':
    'Nume de personaj greșit sau numele există deja.',
} satisfies Partial<Record<keyof typeof en, string>>;
