/** German text of the `reconnect_overlay` interface widget. */

import type en from './en';

export default {
  'resume.title': 'Verbindung verloren',
  'resume.connecting': 'Neu verbinden... (Versuch {attempt})',
  'resume.loggingIn': 'Erneut anmelden...',
  'resume.selecting': 'Betrete die Welt...',
  'resume.cancel': 'Abbrechen',
} satisfies Partial<Record<keyof typeof en, string>>;
