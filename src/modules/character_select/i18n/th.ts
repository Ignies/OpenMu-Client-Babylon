/** Thai text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'พิมพ์มากกว่า 4 ตัวอักษร',
  'characters.create.specialName': 'ใช้สัญลักษณ์ไม่ได้',
  'characters.create.reservedName': 'ชื่อนี้ถูกสงวนไว้',
  'characters.create.failed': 'ชื่อตัวละครไม่ถูกต้อง หรือมีชื่อนี้อยู่แล้ว',
} satisfies Partial<Record<keyof typeof en, string>>;
