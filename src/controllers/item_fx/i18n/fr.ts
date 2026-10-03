/** French text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Classiques',
  'options.itemEffects.both': 'Les deux',
  'options.itemEffects.improved': 'Améliorés',
} satisfies Partial<Record<keyof typeof en, string>>;
