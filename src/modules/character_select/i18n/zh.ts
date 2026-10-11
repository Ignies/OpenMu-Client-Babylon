/** Chinese text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': '请输入 4 个以上的字符',
  'characters.create.specialName': '不能使用符号。',
  'characters.create.reservedName': '该名称已被保留。',
  'characters.create.failed': '角色名不正确，或该名称已被使用。',
} satisfies Partial<Record<keyof typeof en, string>>;
