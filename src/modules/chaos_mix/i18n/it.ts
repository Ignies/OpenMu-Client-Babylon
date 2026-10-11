/** Italian text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Mancano oggetti per la combinazione.',
  'jewelMix.cannotDismantle': 'Non può essere smontato.',
} satisfies Partial<Record<keyof typeof en, string>>;
