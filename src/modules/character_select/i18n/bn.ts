/** bn text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': '4 অক্ষরের বেশি লিখুন',
  'characters.create.specialName': 'চিহ্ন ব্যবহার করা যাবে না।',
  'characters.create.reservedName': 'এই নামটি সংরক্ষিত।',
  'characters.create.failed': 'চরিত্রের নাম ভুল, অথবা একই নামের চরিত্র আগে থেকেই আছে।',
} satisfies Partial<Record<keyof typeof en, string>>;
