/** zh-Hant text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': '請輸入帳號與密碼',
  'login.createAccount': '建立帳號',
  'login.rememberMe': '記住我？',
  'register.id': '帳號',
  'register.password': '密碼',
  'register.confirm': '確認密碼',
  'register.fillEveryField': '請填寫所有欄位。',
  'register.idTooShort': '帳號至少需要{min}個字元。',
  'register.idChars': '帳號只能包含英文字母與數字。',
  'register.passwordTooShort': '密碼至少需要{min}個字元。',
  'register.passwordChars': '密碼只能包含英文字母、數字與基本符號。',
  'register.mismatch': '兩次輸入的密碼不一致。',
  'register.unreachable': '無法連線到伺服器。',
  'register.failed': '註冊失敗（{status}）。',
  'register.created': '帳號已建立，現在可以登入了。',
  'login.savedLogin': '已儲存的登入',
} satisfies Partial<Record<keyof typeof en, string>>;
