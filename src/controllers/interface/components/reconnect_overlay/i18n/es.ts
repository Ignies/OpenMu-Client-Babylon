/** Spanish text of the `reconnect_overlay` interface widget. */

import type en from './en';

export default {
  'resume.title': 'Conexión perdida',
  'resume.connecting': 'Reconectando... (intento {attempt})',
  'resume.loggingIn': 'Iniciando sesión de nuevo...',
  'resume.selecting': 'Entrando al mundo...',
  'resume.cancel': 'Cancelar',
} satisfies Partial<Record<keyof typeof en, string>>;
