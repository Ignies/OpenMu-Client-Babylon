/** Portuguese text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Sessão',
  'session.time': 'Tempo',
  'session.exp': 'Exp',
  'session.kills': 'Abates',
  'session.zen': 'Zen',
  'session.reset': 'Zerar',
} satisfies Partial<Record<keyof typeof en, string>>;
