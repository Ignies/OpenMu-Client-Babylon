/** eu text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'Maisua',
  'skills.levelShort': 'M. {level}',
  'skills.masterLevelShort': 'Maisu M. {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
