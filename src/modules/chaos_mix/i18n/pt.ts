/** Portuguese text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Faltam itens para a combinação.',
  'jewelMix.cannotDismantle': 'Não pode ser desmontado.',
} satisfies Partial<Record<keyof typeof en, string>>;
