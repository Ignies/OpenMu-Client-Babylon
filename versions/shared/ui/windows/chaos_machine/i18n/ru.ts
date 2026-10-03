/** Russian text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': 'Chaos Machine',
  'chaos.combine': 'Совместить',
  'chaos.combining': 'Совмещение…',
  'chaos.tax': 'Налог Chaos: {rate}%',
  'chaosCard.title': 'Chaos Card',
  'chaosCard.hint1': 'Положите Chaos Card на поднос',
  'chaosCard.hint2': 'и нажмите комбинировать, чтобы открыть её.',
} satisfies Partial<Record<keyof typeof en, string>>;
