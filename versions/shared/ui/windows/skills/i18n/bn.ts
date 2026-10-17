/** bn text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'মাস্টার',
  'skills.levelShort': 'লেভেল {level}',
  'skills.masterLevelShort': 'মাস্টার লেভেল {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
