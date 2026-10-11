/** Bulgarian text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'Майсторство',
  'skills.levelShort': 'Нв {level}',
  'skills.masterLevelShort': 'Master нв {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
