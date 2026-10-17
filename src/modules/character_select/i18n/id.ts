/** id text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Ketik lebih dari 4 huruf',
  'characters.create.specialName': 'Tidak boleh memakai simbol.',
  'characters.create.reservedName': 'Nama itu sudah dicadangkan.',
  'characters.create.failed': 'Nama karakter tidak valid atau nama karakter itu sudah ada.',
} satisfies Partial<Record<keyof typeof en, string>>;
