/** Romanian text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Sesiune',
  'session.time': 'Timp',
  'session.exp': 'Exp',
  'session.kills': 'Ucideri',
  'session.zen': 'Zen',
  'session.reset': 'Resetează',
} satisfies Partial<Record<keyof typeof en, string>>;
