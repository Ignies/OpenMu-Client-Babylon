/** Italian text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Chiudi la finestra del Chaos prima di uscire dal gioco.',
  'exit.noAnswer': 'Il server non ha risposto. Si esce comunque.',
  'resume.done': 'Di nuovo online',
  'resume.failed': 'Riconnessione non riuscita',
  'resume.cancelled': 'Riconnessione annullata',
  'login.closingOldSession': 'Account ancora connesso: chiusura della vecchia sessione e nuovo tentativo...',
  'login.tokenRefused': 'L’accesso salvato è scaduto. Inserisci la password.',
  'login.tokenUnanswered': 'Il server non ha risposto all’accesso salvato. Inserisci la password.',
} satisfies Partial<Record<keyof typeof en, string>>;
