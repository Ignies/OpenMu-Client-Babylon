/** ur text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'ماسٹر',
  'skills.levelShort': 'لیول {level}',
  'skills.masterLevelShort': 'ماسٹر لیول {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
