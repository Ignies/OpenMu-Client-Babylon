/** uk text of `src/modules/chaos_mix`. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Бракує предметів для поєднання.',
  'jewelMix.cannotDismantle': 'Це не можна розібрати.',
} satisfies Partial<Record<keyof typeof en, string>>;
