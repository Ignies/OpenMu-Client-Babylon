/** Korean text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': '일반',
  'chat.gens': '문파',
  'chat.blockWhisper': '귓속말 차단',
  'chat.system': '시스템 메시지',
  'chat.log': '대화 기록',
  'chat.frame': '테두리',
  'chat.size': '크기',
  'chat.alpha': '투명도',
  'chat.whisperOff': '귓속말이 꺼져 있습니다(F3)',
  'chat.emoji.button': '이모지',
  'chat.emoji.recent': '최근 사용',
  'chat.latest': '최신 메시지로 돌아가기',
} satisfies Partial<Record<keyof typeof en, string>>;
