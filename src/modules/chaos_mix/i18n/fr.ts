/** French text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Il manque des objets pour la combinaison.',
  'jewelMix.cannotDismantle': 'Impossible à démonter.',
} satisfies Partial<Record<keyof typeof en, string>>;
