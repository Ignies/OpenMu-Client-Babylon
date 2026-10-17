/** zh-Hant text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': '請輸入4個字以上',
  'characters.create.specialName': '不能使用符號。',
  'characters.create.reservedName': '此名稱已被保留。',
  'characters.create.failed': '角色名稱不正確，或已有相同名稱的角色。',
} satisfies Partial<Record<keyof typeof en, string>>;
