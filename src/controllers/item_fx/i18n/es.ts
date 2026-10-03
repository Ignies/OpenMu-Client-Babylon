/** Spanish text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Clásicos',
  'options.itemEffects.both': 'Ambos',
  'options.itemEffects.improved': 'Mejorados',
} satisfies Partial<Record<keyof typeof en, string>>;
