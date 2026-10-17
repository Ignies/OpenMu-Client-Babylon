/** fil text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Luma',
  'options.itemEffects.both': 'Pareho',
  'options.itemEffects.improved': 'Pinahusay',
} satisfies Partial<Record<keyof typeof en, string>>;
