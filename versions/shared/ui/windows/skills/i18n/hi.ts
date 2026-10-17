/** hi text of `versions/shared/ui/windows/skills`. */

import type en from './en';

export default {
  'skills.master': 'मास्टर',
  'skills.levelShort': 'लेवल {level}',
  'skills.masterLevelShort': 'मास्टर लेवल {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
