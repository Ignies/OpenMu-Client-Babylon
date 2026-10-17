/** fa text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'بیش از 4 حرف بنویسید',
  'characters.create.specialName': 'استفاده از نماد مجاز نیست.',
  'characters.create.reservedName': 'این نام رزرو شده است.',
  'characters.create.failed': 'نام کاراکتر نادرست است یا کاراکتری با همین نام وجود دارد.',
} satisfies Partial<Record<keyof typeof en, string>>;
