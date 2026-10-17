/** fa text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'استادی',
  'skills.levelShort': 'سطح {level}',
  'skills.masterLevelShort': 'سطح استادی {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
