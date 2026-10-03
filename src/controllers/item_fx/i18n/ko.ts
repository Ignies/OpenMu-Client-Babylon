/** Korean text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': '기존',
  'options.itemEffects.both': '둘 다',
  'options.itemEffects.improved': '향상',
} satisfies Partial<Record<keyof typeof en, string>>;
