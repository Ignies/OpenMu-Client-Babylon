/** Chinese text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': '经典',
  'options.itemEffects.both': '两者',
  'options.itemEffects.improved': '增强',
} satisfies Partial<Record<keyof typeof en, string>>;
