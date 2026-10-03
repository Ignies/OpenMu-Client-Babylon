/** Vietnamese text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'Phiên chơi',
  'session.time': 'Thời gian',
  'session.exp': 'Exp',
  'session.kills': 'Hạ gục',
  'session.zen': 'Zen',
  'session.reset': 'Đặt lại',
} satisfies Partial<Record<keyof typeof en, string>>;
