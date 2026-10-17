/** ar text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'اكتب أكثر من 4 أحرف',
  'characters.create.specialName': 'لا يمكن استخدام الرموز.',
  'characters.create.reservedName': 'هذا الاسم محجوز.',
  'characters.create.failed': 'اسم الشخصية غير صحيح أو مستخدم بالفعل.',
} satisfies Partial<Record<keyof typeof en, string>>;
