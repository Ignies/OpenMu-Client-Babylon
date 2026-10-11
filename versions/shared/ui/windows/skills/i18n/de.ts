/** German text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'Meister',
  'skills.levelShort': 'Lv {level}',
  'skills.masterLevelShort': 'Master Lv {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
