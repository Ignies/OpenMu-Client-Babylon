/** cs text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'Mistrovské',
  'skills.levelShort': 'Úr. {level}',
  'skills.masterLevelShort': 'Mistr. úr. {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
