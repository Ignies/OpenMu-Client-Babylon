/** cs text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Původní',
  'options.itemEffects.both': 'Obojí',
  'options.itemEffects.improved': 'Vylepšené',
} satisfies Partial<Record<keyof typeof en, string>>;
