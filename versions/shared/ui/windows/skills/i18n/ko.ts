/** Korean text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': '마스터',
  'skills.levelShort': 'Lv {level}',
  'skills.masterLevelShort': '마스터 Lv {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
