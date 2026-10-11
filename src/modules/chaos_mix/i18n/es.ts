/** Spanish text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Faltan objetos para la combinación.',
  'jewelMix.cannotDismantle': 'No se puede desarmar.',
} satisfies Partial<Record<keyof typeof en, string>>;
