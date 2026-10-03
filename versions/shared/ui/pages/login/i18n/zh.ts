/** Chinese text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': '请输入账号和密码',
  'login.createAccount': '创建账号',
  'login.rememberMe': '记住我？',

  'register.id': '账号',
  'register.password': '密码',
  'register.confirm': '确认',
  'register.fillEveryField': '请填写所有字段。',
  'register.idTooShort': '账号至少需要 {min} 个字符。',
  'register.idChars': '账号只能包含字母和数字。',
  'register.passwordTooShort': '密码至少需要 {min} 个字符。',

  'register.passwordChars': '密码只能包含字母、数字和基本符号。',
  'register.mismatch': '两次输入的密码不一致。',
  'register.unreachable': '无法连接到服务器。',
  'register.failed': '注册失败（{status}）。',
  'register.created': '账号已创建，现在可以登录了。',
} satisfies Partial<Record<keyof typeof en, string>>;
