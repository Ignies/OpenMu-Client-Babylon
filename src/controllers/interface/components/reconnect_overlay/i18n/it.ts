/** Italian text of the `reconnect_overlay` interface widget. */

import type en from './en';

export default {
  'resume.title': 'Connessione persa',
  'resume.connecting': 'Riconnessione... (tentativo {attempt})',
  'resume.loggingIn': 'Nuovo accesso...',
  'resume.selecting': 'Ingresso nel mondo...',
  'resume.cancel': 'Annulla',
} satisfies Partial<Record<keyof typeof en, string>>;
