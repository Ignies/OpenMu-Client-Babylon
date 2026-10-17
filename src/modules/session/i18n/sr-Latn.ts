/** sr-Latn text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Iz igre možeš izaći tek kada zatvoriš prozor Chaos mašine.',
  'exit.noAnswer': 'Server nije odgovorio. Izlazak ipak sledi.',
  'resume.done': 'Ponovo na mreži',
  'resume.failed': 'Ponovno povezivanje nije uspelo',
  'resume.cancelled': 'Ponovno povezivanje je otkazano',
} satisfies Partial<Record<keyof typeof en, string>>;
