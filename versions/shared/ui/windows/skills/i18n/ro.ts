/** Romanian text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'Maestru',
  'skills.levelShort': 'Niv {level}',
  'skills.masterLevelShort': 'Master niv {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
