/** sr-Latn text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'Master',
  'skills.levelShort': 'Niv. {level}',
  'skills.masterLevelShort': 'Master niv. {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
