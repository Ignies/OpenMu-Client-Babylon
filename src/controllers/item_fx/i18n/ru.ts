/** Russian text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Классические',
  'options.itemEffects.both': 'Оба',
  'options.itemEffects.improved': 'Улучшенные',
} satisfies Partial<Record<keyof typeof en, string>>;
