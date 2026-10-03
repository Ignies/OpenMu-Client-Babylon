/** German text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Sitzung',
  'session.time': 'Zeit',
  'session.exp': 'Exp',
  'session.kills': 'Kills',
  'session.zen': 'Zen',
  'session.reset': 'Zurücksetzen',
} satisfies Partial<Record<keyof typeof en, string>>;
