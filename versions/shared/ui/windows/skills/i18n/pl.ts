/** Polish text of the `skills` window. */

import type en from './en';

export default {
  'skills.master': 'Master',
  'skills.levelShort': 'Poz. {level}',
  'skills.masterLevelShort': 'Master poz. {level}',
} satisfies Partial<Record<keyof typeof en, string>>;
