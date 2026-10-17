/** zh-Hant text of `versions/shared/ui/windows/session_stats`. */

import type en from './en';

export default {
  'session.title': '本次遊戲',
  'session.time': '時間',
  'session.exp': '經驗值',
  'session.kills': '擊殺',
  'session.zen': '金幣',
  'session.reset': '轉生',
} satisfies Partial<Record<keyof typeof en, string>>;
