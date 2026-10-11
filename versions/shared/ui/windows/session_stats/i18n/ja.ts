/** Japanese text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'セッション',
  'session.time': '時間',
  'session.exp': '経験値',
  'session.kills': '討伐',
  'session.zen': 'Zen',
  'session.reset': 'リセット',
} satisfies Partial<Record<keyof typeof en, string>>;
