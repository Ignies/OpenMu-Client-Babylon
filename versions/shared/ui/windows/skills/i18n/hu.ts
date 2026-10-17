/** hu text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'Mester',
  'skills.levelShort': 'Lv {level}',
  'skills.masterLevelShort': 'Mester Lv {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
