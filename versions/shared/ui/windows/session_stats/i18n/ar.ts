/** ar text of `versions/shared/ui/windows/session_stats`. */

import type en from './en';

export default {
  'session.title': 'الجلسة',
  'session.time': 'الوقت',
  'session.exp': 'الخبرة',
  'session.kills': 'مرات القتل',
  'session.zen': 'Zen',
  'session.reset': 'إعادة التعيين',
} satisfies Partial<Record<keyof typeof en, string>>;
