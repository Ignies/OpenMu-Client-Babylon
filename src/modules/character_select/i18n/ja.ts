/** Japanese text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': '5 文字以上で入力してください',
  'characters.create.specialName': '記号は使用できません。',
  'characters.create.reservedName': 'その名前は予約されています。',
  'characters.create.failed':
    'キャラクター名が正しくないか、同じ名前が既に存在します。',
} satisfies Partial<Record<keyof typeof en, string>>;
