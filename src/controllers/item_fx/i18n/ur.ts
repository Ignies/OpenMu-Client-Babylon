/** ur text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'پرانا',
  'options.itemEffects.both': 'دونوں',
  'options.itemEffects.improved': 'بہتر',
} satisfies Partial<Record<keyof typeof en, string>>;
