/** Romanian text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Clasice',
  'options.itemEffects.both': 'Ambele',
  'options.itemEffects.improved': 'Îmbunătățite',
} satisfies Partial<Record<keyof typeof en, string>>;
