/** Russian text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Сессия',
  'session.time': 'Время',
  'session.exp': 'Опыт',
  'session.kills': 'Убийства',
  'session.zen': 'Zen',
  'session.reset': 'Сброс',
} satisfies Partial<Record<keyof typeof en, string>>;
