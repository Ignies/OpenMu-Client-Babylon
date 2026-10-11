/** Chinese text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': '大师',
  'skills.levelShort': '等级 {level}',
  'skills.masterLevelShort': '大师等级 {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
