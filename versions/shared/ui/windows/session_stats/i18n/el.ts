/** el text of `versions/shared/ui/windows/session_stats`. */

import type en from './en';

export default {
  'session.title': 'Συνεδρία',
  'session.time': 'Χρόνος',
  'session.exp': 'EXP',
  'session.kills': 'Εξοντώσεις',
  'session.zen': 'Zen',
  'session.reset': 'Μηδενισμός',
} satisfies Partial<Record<keyof typeof en, string>>;
