/** hu text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'A kilépéshez előbb zárd be a Chaos Machine ablakát.',
  'exit.noAnswer': 'A szerver nem válaszolt. Kilépés mindenképp.',
  'resume.done': 'Újra online',
  'resume.failed': 'Nem sikerült újracsatlakozni',
  'resume.cancelled': 'Újracsatlakozás megszakítva',
} satisfies Partial<Record<keyof typeof en, string>>;
