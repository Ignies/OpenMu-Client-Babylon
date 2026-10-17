/** hu text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'A kilépéshez előbb zárd be a Chaos Machine ablakát.',
  'exit.noAnswer': 'A szerver nem válaszolt. Kilépés mindenképp.',
  'resume.done': 'Újra online',
  'resume.failed': 'Nem sikerült újracsatlakozni',
  'resume.cancelled': 'Újracsatlakozás megszakítva',
  'login.closingOldSession':
    'A fiók még csatlakozva van: a régi munkamenet bezárása és újrapróbálkozás...',
  'login.tokenRefused': 'A mentett bejelentkezés lejárt. Add meg a jelszavadat.',
  'login.tokenUnanswered':
    'A szerver nem válaszolt a mentett bejelentkezésre. Add meg a jelszavadat.',
} satisfies Partial<Record<keyof typeof en, string>>;
