/** Italian text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': 'Chaos Machine',
  'chaos.combine': 'Combina',
  'chaos.combining': 'Combinazione…',
  'chaos.tax': 'Tassa del Chaos: {rate}%',
  'chaosCard.title': 'Chaos Card',
  'chaosCard.hint1': 'Metti una Chaos Card nel vassoio',
  'chaosCard.hint2': 'e premi combina per aprirla.',
} satisfies Partial<Record<keyof typeof en, string>>;
