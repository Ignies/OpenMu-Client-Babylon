/** Polish text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Sesja',
  'session.time': 'Czas',
  'session.exp': 'Exp',
  'session.kills': 'Zabójstwa',
  'session.zen': 'Zen',
  'session.reset': 'Resetuj',
} satisfies Partial<Record<keyof typeof en, string>>;
