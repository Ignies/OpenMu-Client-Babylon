/** Korean text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': '대화방',
  'chatRoom.connecting': '대화 서버에 연결하는 중...',
  'chatRoom.closed': '연결이 끊겼습니다',
  'chatRoom.members': '참가자 ({count})',
  'chatRoom.invite': '초대',
  'chatRoom.inviteEmpty': '접속 중인 다른 친구가 없습니다.',
  'chatRoom.inputPlaceholder': '메시지를 입력하세요',
  'chatRoom.waiting': '{name}님이 들어오기를 기다리는 중...',
} satisfies Partial<Record<keyof typeof en, string>>;
