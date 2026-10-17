/** sr-Latn text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Iz igre možeš izaći tek kada zatvoriš prozor Chaos mašine.',
  'exit.noAnswer': 'Server nije odgovorio. Izlazak ipak sledi.',
  'resume.done': 'Ponovo na mreži',
  'resume.failed': 'Ponovno povezivanje nije uspelo',
  'resume.cancelled': 'Ponovno povezivanje je otkazano',
  'login.closingOldSession': 'Nalog je još povezan: zatvaram staru sesiju i pokušavam ponovo...',
  'login.tokenRefused': 'Tvoja sačuvana prijava je istekla. Unesi lozinku.',
  'login.tokenUnanswered': 'Server nije odgovorio na sačuvanu prijavu. Unesi lozinku.',
} satisfies Partial<Record<keyof typeof en, string>>;
