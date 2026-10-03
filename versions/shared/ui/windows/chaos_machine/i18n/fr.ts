/** French text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': 'Chaos Machine',
  'chaos.combine': 'Combiner',
  'chaos.combining': 'Combinaison…',
  'chaos.tax': 'Taxe du Chaos : {rate}%',
  'chaosCard.title': 'Chaos Card',
  'chaosCard.hint1': 'Placez une Chaos Card dans le plateau',
  'chaosCard.hint2': 'puis lancez la combinaison pour l’ouvrir.',
} satisfies Partial<Record<keyof typeof en, string>>;
