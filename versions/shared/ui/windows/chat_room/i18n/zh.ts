/** Chinese text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': '聊天室',
  'chatRoom.connecting': '正在连接聊天服务器...',
  'chatRoom.closed': '已断开',
  'chatRoom.members': '成员（{count}）',
  'chatRoom.invite': '邀请',
  'chatRoom.inviteEmpty': '没有其他好友在线。',
  'chatRoom.inputPlaceholder': '输入消息',
  'chatRoom.waiting': '正在等待 {name} 加入...',
} satisfies Partial<Record<keyof typeof en, string>>;
