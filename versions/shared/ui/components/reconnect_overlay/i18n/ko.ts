/** Korean text of the `reconnect_overlay` UI component. */

import type en from './en';

export default {
  'resume.title': '접속이 끊겼습니다',
  'resume.connecting': '재접속 중... ({attempt}번째)',
  'resume.loggingIn': '다시 로그인하는 중...',
  'resume.selecting': '월드에 들어가는 중...',
  'resume.cancel': '취소',
} satisfies Partial<Record<keyof typeof en, string>>;
