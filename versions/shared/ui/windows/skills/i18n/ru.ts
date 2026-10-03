/** Russian text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'Мастерство',
  'skills.levelShort': 'Ур. {level}',
  'skills.masterLevelShort': 'Master ур. {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
