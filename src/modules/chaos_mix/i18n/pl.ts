/** Polish text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Brakuje przedmiotów do kombinacji.',
  'jewelMix.cannotDismantle': 'Nie można rozdzielić.',
} satisfies Partial<Record<keyof typeof en, string>>;
