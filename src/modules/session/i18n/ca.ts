/** ca text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Tanca la interfície del caos abans de sortir del joc.',
  'exit.noAnswer': 'El servidor no ha respost. Se surt igualment.',
  'resume.done': 'De nou en línia',
  'resume.failed': 'No s\'ha pogut reconnectar',
  'resume.cancelled': 'Reconnexió cancel·lada',
} satisfies Partial<Record<keyof typeof en, string>>;
