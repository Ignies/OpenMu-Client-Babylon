/** Romanian text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Închide fereastra Chaos înainte să ieși din joc.',
  'exit.noAnswer': 'Serverul nu a răspuns. Ieșim oricum.',
  'resume.done': 'Din nou online',
  'resume.failed': 'Reconectarea a eșuat',
  'resume.cancelled': 'Reconectare anulată',
} satisfies Partial<Record<keyof typeof en, string>>;
