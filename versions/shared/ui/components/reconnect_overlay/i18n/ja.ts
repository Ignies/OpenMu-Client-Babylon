/** Japanese text of the `reconnect_overlay` UI component. */

import type en from './en';

export default {
  'resume.title': '接続が切れました',
  'resume.connecting': '再接続中...（{attempt} 回目）',
  'resume.loggingIn': '再ログイン中...',
  'resume.selecting': 'ワールドに入っています...',
  'resume.cancel': 'キャンセル',
} satisfies Partial<Record<keyof typeof en, string>>;
