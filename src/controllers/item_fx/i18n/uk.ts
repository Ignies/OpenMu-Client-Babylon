/** uk text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Класичні',
  'options.itemEffects.both': 'Обидва',
  'options.itemEffects.improved': 'Покращені',
} satisfies Partial<Record<keyof typeof en, string>>;
