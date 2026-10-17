/** cs text of `versions/shared/ui/windows/session_stats`. */

import type en from './en';

export default {
  'session.title': 'Relace',
  'session.time': 'Čas',
  'session.exp': 'EXP',
  'session.kills': 'Zabití',
  'session.zen': 'Zen',
  'session.reset': 'Resetovat',
} satisfies Partial<Record<keyof typeof en, string>>;
