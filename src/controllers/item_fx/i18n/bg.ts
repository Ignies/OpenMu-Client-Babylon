/** Bulgarian text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Класически',
  'options.itemEffects.both': 'И двете',
  'options.itemEffects.improved': 'Подобрени',
} satisfies Partial<Record<keyof typeof en, string>>;
