/** Spanish text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': 'Chaos Machine',
  'chaos.combine': 'Combinar',
  'chaos.combining': 'Combinando…',
  'chaos.tax': 'Impuesto del Chaos: {rate}%',
  'chaosCard.title': 'Chaos Card',
  'chaosCard.hint1': 'Pon una Chaos Card en la bandeja',
  'chaosCard.hint2': 'y pulsa combinar para abrirla.',
} satisfies Partial<Record<keyof typeof en, string>>;
