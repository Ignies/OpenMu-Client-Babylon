/** Spanish text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'Maestría',
  'skills.levelShort': 'Nv {level}',
  'skills.masterLevelShort': 'Master Nv {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
