/** Romanian text of the `reconnect_overlay` UI component. */

import type en from './en';

export default {
  'resume.title': 'Conexiune pierdută',
  'resume.connecting': 'Reconectare... (încercarea {attempt})',
  'resume.loggingIn': 'Autentificare din nou...',
  'resume.selecting': 'Intrare în lume...',
  'resume.cancel': 'Anulează',
} satisfies Partial<Record<keyof typeof en, string>>;
