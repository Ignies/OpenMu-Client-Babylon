/** German text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': 'Chaos Machine',
  'chaos.combine': 'Kombinieren',
  'chaos.combining': 'Wird kombiniert…',
  'chaos.tax': 'Chaos-Steuer: {rate}%',
  'chaosCard.title': 'Chaos Card',
  'chaosCard.hint1': 'Lege eine Chaos Card in das Fach',
  'chaosCard.hint2': 'und drücke Kombinieren, um sie zu öffnen.',
} satisfies Partial<Record<keyof typeof en, string>>;
