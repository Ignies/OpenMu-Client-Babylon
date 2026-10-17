/** el text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Κλασικά',
  'options.itemEffects.both': 'Και τα δύο',
  'options.itemEffects.improved': 'Βελτιωμένα',
} satisfies Partial<Record<keyof typeof en, string>>;
