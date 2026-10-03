/** Korean text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': '5자 이상 입력하세요',
  'characters.create.specialName': '기호는 사용할 수 없습니다.',
  'characters.create.reservedName': '예약된 이름입니다.',
  'characters.create.failed':
    '캐릭터 이름이 올바르지 않거나 이미 존재합니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
