/** Bulgarian text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Липсват предмети за комбинацията.',
  'jewelMix.cannotDismantle': 'Не може да бъде разглобено.',
} satisfies Partial<Record<keyof typeof en, string>>;
