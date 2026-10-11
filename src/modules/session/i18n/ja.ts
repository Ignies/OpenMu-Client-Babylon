/** Japanese text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'カオスウィンドウを閉じてからゲームを終了してください。',
  'exit.noAnswer': 'サーバーから応答がありません。そのまま終了します。',
  'resume.done': 'オンラインに戻りました',
  'resume.failed': '再接続できませんでした',
  'resume.cancelled': '再接続を中止しました',
  'login.closingOldSession': 'アカウントがまだ接続中です。古いセッションを閉じて再試行しています...',
} satisfies Partial<Record<keyof typeof en, string>>;
