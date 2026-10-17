/** fil text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'Master',
  'skills.levelShort': 'Lv {level}',
  'skills.masterLevelShort': 'Master Lv {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
