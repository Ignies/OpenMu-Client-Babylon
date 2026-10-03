/** Bulgarian text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Сесия',
  'session.time': 'Време',
  'session.exp': 'Опит',
  'session.kills': 'Убийства',
  'session.zen': 'Zen',
  'session.reset': 'Нулирай',
} satisfies Partial<Record<keyof typeof en, string>>;
