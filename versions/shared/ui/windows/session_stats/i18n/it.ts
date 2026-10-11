/** Italian text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Sessione',
  'session.time': 'Tempo',
  'session.exp': 'Exp',
  'session.kills': 'Uccisioni',
  'session.zen': 'Zen',
  'session.reset': 'Azzera',
} satisfies Partial<Record<keyof typeof en, string>>;
