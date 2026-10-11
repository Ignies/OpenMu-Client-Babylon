/** German text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Für die Kombination fehlen Gegenstände.',
  'jewelMix.cannotDismantle': 'Kann nicht zerlegt werden.',
} satisfies Partial<Record<keyof typeof en, string>>;
