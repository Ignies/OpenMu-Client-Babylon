/** Polish text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': 'Chaos Machine',
  'chaos.combine': 'Połącz',
  'chaos.combining': 'Łączenie…',
  'chaos.tax': 'Podatek Chaos: {rate}%',
  'chaosCard.title': 'Chaos Card',
  'chaosCard.hint1': 'Włóż Chaos Card do tacy',
  'chaosCard.hint2': 'i naciśnij Połącz, aby ją otworzyć.',
} satisfies Partial<Record<keyof typeof en, string>>;
