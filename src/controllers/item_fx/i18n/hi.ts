/** hi text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'पुराना',
  'options.itemEffects.both': 'दोनों',
  'options.itemEffects.improved': 'बेहतर',
} satisfies Partial<Record<keyof typeof en, string>>;
