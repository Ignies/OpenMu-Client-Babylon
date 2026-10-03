/** Vietnamese text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'Master',
  'skills.levelShort': 'Cấp {level}',
  'skills.masterLevelShort': 'Master cấp {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
