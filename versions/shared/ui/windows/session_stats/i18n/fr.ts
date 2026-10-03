/** French text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Session',
  'session.time': 'Durée',
  'session.exp': 'Exp',
  'session.kills': 'Éliminations',
  'session.zen': 'Zen',
  'session.reset': 'Réinitialiser',
} satisfies Partial<Record<keyof typeof en, string>>;
