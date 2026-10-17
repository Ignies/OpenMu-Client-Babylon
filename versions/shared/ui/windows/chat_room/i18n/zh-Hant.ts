/** zh-Hant text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': '聊天室',
  'chatRoom.connecting': '正在連線聊天伺服器……',
  'chatRoom.closed': '已中斷連線',
  'chatRoom.members': '成員（{count}）',
  'chatRoom.invite': '邀請',
  'chatRoom.inviteEmpty': '沒有其他好友在線上。',
  'chatRoom.inputPlaceholder': '輸入訊息',
  'chatRoom.waiting': '等待玩家{name}加入……',
} satisfies Partial<Record<keyof typeof en, string>>;
