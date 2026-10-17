/** tr text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': '4 harften fazla yaz',
  'characters.create.specialName': 'Simge kullanılamaz.',
  'characters.create.reservedName': 'Bu ad ayrılmış.',
  'characters.create.failed':
    'Geçersiz bir karakter adı girildi ya da bu adda bir karakter zaten var.',
} satisfies Partial<Record<keyof typeof en, string>>;
