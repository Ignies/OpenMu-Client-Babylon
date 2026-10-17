/** el text of `src/controllers/item_rules`. */

import type en from './en';

export default {
  'options.compare.shift': 'Με Shift πατημένο',
  'options.compare.always': 'Πάντα',
  'item.ringOfGlory': 'Δαχτυλίδι της δόξας',
  'item.darkStone': 'Σκοτεινή πέτρα',
} satisfies Partial<Record<keyof typeof en, string>>;
