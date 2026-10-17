/** uk text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'Майстерність',
  'skills.levelShort': 'Рів. {level}',
  'skills.masterLevelShort': 'Рів. майстра {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
