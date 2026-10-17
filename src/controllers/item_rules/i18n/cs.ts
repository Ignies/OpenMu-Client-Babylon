/** cs text of `src/controllers/item_rules`. */

import type en from './en';

export default {
  'options.compare.shift': 'Držet Shift',
  'options.compare.always': 'Vždy',
  'item.ringOfGlory': 'Prsten slávy',
  'item.darkStone': 'Temný kámen',
} satisfies Partial<Record<keyof typeof en, string>>;
