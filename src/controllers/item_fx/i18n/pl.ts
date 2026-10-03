/** Polish text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Klasyczne',
  'options.itemEffects.both': 'Oba',
  'options.itemEffects.improved': 'Ulepszone',
} satisfies Partial<Record<keyof typeof en, string>>;
