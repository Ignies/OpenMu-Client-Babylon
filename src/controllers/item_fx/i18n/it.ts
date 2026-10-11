/** Italian text of the `item_fx` controller. */

import type en from './en';

export default {
  'options.itemEffects.legacy': 'Classici',
  'options.itemEffects.both': 'Entrambi',
  'options.itemEffects.improved': 'Migliorati',
} satisfies Partial<Record<keyof typeof en, string>>;
