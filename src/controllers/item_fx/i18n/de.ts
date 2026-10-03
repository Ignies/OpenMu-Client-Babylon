/** German text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Klassisch',
  'options.itemEffects.both': 'Beides',
  'options.itemEffects.improved': 'Verbessert',
} satisfies Partial<Record<keyof typeof en, string>>;
