/** Japanese text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'アカウント名とパスワードを入力してください',
  'login.createAccount': 'アカウント作成',
  'login.rememberMe': 'ログイン情報を保存しますか？',

  'register.id': 'ID',
  'register.password': 'パスワード',
  'register.confirm': '確認',
  'register.fillEveryField': 'すべての項目を入力してください。',
  'register.idTooShort': 'IDは{min}文字以上にしてください。',
  'register.idChars': 'IDに使えるのは英数字だけです。',
  'register.passwordTooShort': 'パスワードは{min}文字以上にしてください。',

  'register.passwordChars': 'パスワードに使えるのは英数字と基本的な記号だけです。',
  'register.mismatch': 'パスワードが一致しません。',
  'register.unreachable': 'サーバーに接続できませんでした。',
  'register.failed': '登録に失敗しました（{status}）。',
  'register.created': 'アカウントを作成しました。ログインできます。',
  'login.savedLogin': '保存済み',
} satisfies Partial<Record<keyof typeof en, string>>;
