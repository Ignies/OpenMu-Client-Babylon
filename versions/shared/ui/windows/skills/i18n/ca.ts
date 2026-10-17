/** ca text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'Mestre',
  'skills.levelShort': 'Nv. {level}',
  'skills.masterLevelShort': 'Nv. mestre {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
