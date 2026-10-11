/** Japanese text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'マスター',
  'skills.levelShort': 'Lv {level}',
  'skills.masterLevelShort': 'マスター Lv {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
