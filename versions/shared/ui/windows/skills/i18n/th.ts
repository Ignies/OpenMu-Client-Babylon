/** Thai text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'มาสเตอร์',
  'skills.levelShort': 'Lv {level}',
  'skills.masterLevelShort': 'มาสเตอร์ Lv {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
