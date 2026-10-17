/** hu text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Eredeti',
  'options.itemEffects.both': 'Mindkettő',
  'options.itemEffects.improved': 'Javított',
} satisfies Partial<Record<keyof typeof en, string>>;
