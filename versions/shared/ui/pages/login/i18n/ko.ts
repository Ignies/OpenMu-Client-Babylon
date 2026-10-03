/** Korean text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': '계정과 비밀번호를 입력하세요',
  'login.createAccount': '계정 만들기',
  'login.rememberMe': '로그인 정보를 저장할까요?',

  'register.id': 'ID',
  'register.password': '비밀번호',
  'register.confirm': '확인',
  'register.fillEveryField': '모든 항목을 입력해 주세요.',
  'register.idTooShort': 'ID는 {min}자 이상이어야 합니다.',
  'register.idChars': 'ID에는 영문과 숫자만 사용할 수 있습니다.',
  'register.passwordTooShort': '비밀번호는 {min}자 이상이어야 합니다.',

  'register.passwordChars': '비밀번호에는 영문과 숫자, 기본 기호만 사용할 수 있습니다.',
  'register.mismatch': '비밀번호가 일치하지 않습니다.',
  'register.unreachable': '서버에 연결할 수 없습니다.',
  'register.failed': '계정 생성에 실패했습니다({status}).',
  'register.created': '계정이 생성되었습니다. 이제 로그인할 수 있습니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
