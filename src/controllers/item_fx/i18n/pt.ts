/** Portuguese text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Clássicos',
  'options.itemEffects.both': 'Ambos',
  'options.itemEffects.improved': 'Melhorados',
} satisfies Partial<Record<keyof typeof en, string>>;
