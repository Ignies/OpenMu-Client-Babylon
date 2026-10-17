/** id text of `src/controllers/item_rules`. */

import type en from './en';

export default {
  'options.compare.shift': 'Tahan Shift',
  'options.compare.always': 'Selalu',
  'item.ringOfGlory': 'Ring of Glory',
  'item.darkStone': 'Dark Stone',
} satisfies Partial<Record<keyof typeof en, string>>;
