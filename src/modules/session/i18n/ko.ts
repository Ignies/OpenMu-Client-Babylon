/** Korean text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': '카오스 창을 닫은 뒤에 게임을 종료하세요.',
  'exit.noAnswer': '서버가 응답하지 않았습니다. 그대로 나갑니다.',
  'resume.done': '다시 접속했습니다',
  'resume.failed': '재접속하지 못했습니다',
  'resume.cancelled': '재접속을 취소했습니다',
} satisfies Partial<Record<keyof typeof en, string>>;
