/** cs text of `src/modules/chaos_mix`. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Chybí předměty pro kombinaci.',
  'jewelMix.cannotDismantle': 'Nelze rozložit.',
} satisfies Partial<Record<keyof typeof en, string>>;
