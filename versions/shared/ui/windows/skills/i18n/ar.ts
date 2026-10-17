/** ar text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'الإتقان',
  'skills.levelShort': 'مستوى {level}',
  'skills.masterLevelShort': 'مستوى الإتقان {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
