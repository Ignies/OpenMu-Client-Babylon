/** el text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'Master',
  'skills.levelShort': 'Επ. {level}',
  'skills.masterLevelShort': 'Master Επ. {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
