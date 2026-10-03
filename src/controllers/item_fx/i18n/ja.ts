/** Japanese text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': '従来',
  'options.itemEffects.both': '両方',
  'options.itemEffects.improved': '強化',
} satisfies Partial<Record<keyof typeof en, string>>;
