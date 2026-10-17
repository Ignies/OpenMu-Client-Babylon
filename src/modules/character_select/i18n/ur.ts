/** ur text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': '4 سے زیادہ حروف لکھیں',
  'characters.create.specialName': 'علامات استعمال نہیں ہو سکتیں۔',
  'characters.create.reservedName': 'یہ نام محفوظ ہے۔',
  'characters.create.failed': 'کردار کا نام غلط ہے یا اسی نام کا کردار پہلے سے موجود ہے۔',
} satisfies Partial<Record<keyof typeof en, string>>;
