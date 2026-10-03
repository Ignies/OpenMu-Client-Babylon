/** Italian text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Chiudi la finestra del Chaos prima di uscire dal gioco.',
  'exit.noAnswer': 'Il server non ha risposto. Si esce comunque.',
  'resume.done': 'Di nuovo online',
  'resume.failed': 'Riconnessione non riuscita',
  'resume.cancelled': 'Riconnessione annullata',
} satisfies Partial<Record<keyof typeof en, string>>;
