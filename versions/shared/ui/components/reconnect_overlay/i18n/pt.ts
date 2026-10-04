/** Portuguese text of the `reconnect_overlay` UI component. */

import type en from './en';

export default {
  'resume.title': 'Conexão perdida',
  'resume.connecting': 'Reconectando... (tentativa {attempt})',
  'resume.loggingIn': 'Entrando na conta...',
  'resume.selecting': 'Entrando no mundo...',
  'resume.cancel': 'Cancelar',
} satisfies Partial<Record<keyof typeof en, string>>;
