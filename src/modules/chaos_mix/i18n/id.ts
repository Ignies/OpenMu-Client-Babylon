/** id text of `src/modules/chaos_mix`. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Item untuk penggabungan tidak mencukupi.',
  'jewelMix.cannotDismantle': 'Tidak dapat diurai.',
} satisfies Partial<Record<keyof typeof en, string>>;
