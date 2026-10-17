/** fil text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Mag-type ng higit sa 4 na titik',
  'characters.create.specialName': 'Bawal ang mga simbolo.',
  'characters.create.reservedName': 'Nakareserba ang pangalang iyan.',
  'characters.create.failed': 'Mali ang pangalan ng karakter o may kapareho na itong pangalan.',
} satisfies Partial<Record<keyof typeof en, string>>;
