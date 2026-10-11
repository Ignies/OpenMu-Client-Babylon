/** Spanish text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Sesión',
  'session.time': 'Tiempo',
  'session.exp': 'Exp',
  'session.kills': 'Muertes',
  'session.zen': 'Zen',
  'session.reset': 'Reiniciar',
} satisfies Partial<Record<keyof typeof en, string>>;
