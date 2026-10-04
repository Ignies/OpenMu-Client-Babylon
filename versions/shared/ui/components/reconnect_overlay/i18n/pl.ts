/** Polish text of the `reconnect_overlay` UI component. */

import type en from './en';

export default {
  'resume.title': 'Utracono połączenie',
  'resume.connecting': 'Ponowne łączenie... (próba {attempt})',
  'resume.loggingIn': 'Ponowne logowanie...',
  'resume.selecting': 'Wchodzenie do świata...',
  'resume.cancel': 'Anuluj',
} satisfies Partial<Record<keyof typeof en, string>>;
