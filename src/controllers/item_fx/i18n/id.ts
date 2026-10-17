/** id text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Klasik',
  'options.itemEffects.both': 'Keduanya',
  'options.itemEffects.improved': 'Ditingkatkan',
} satisfies Partial<Record<keyof typeof en, string>>;
