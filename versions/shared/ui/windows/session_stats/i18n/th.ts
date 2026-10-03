/** Thai text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': 'รอบนี้',
  'session.time': 'เวลา',
  'session.exp': 'ค่าประสบการณ์',
  'session.kills': 'สังหาร',
  'session.zen': 'Zen',
  'session.reset': 'รีเซ็ต',
} satisfies Partial<Record<keyof typeof en, string>>;
