/** ca text of `src/controllers/item_fx`. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Clàssics',
  'options.itemEffects.both': 'Tots dos',
  'options.itemEffects.improved': 'Millorats',
} satisfies Partial<Record<keyof typeof en, string>>;
