/** Korean text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': '세션',
  'session.time': '시간',
  'session.exp': '경험치',
  'session.kills': '처치',
  'session.zen': 'Zen',
  'session.reset': '초기화',
} satisfies Partial<Record<keyof typeof en, string>>;
