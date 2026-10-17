/** el text of `src/modules/chaos_mix`. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Λείπουν αντικείμενα για τη σύνθεση.',
  'jewelMix.cannotDismantle': 'Δεν μπορεί να διαλυθεί.',
} satisfies Partial<Record<keyof typeof en, string>>;
