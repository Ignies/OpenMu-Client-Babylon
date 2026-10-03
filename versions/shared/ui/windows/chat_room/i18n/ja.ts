/** Japanese text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'チャットルーム',
  'chatRoom.connecting': 'チャットサーバーに接続しています...',
  'chatRoom.closed': '切断されました',
  'chatRoom.members': 'メンバー（{count}）',
  'chatRoom.invite': '招待',
  'chatRoom.inviteEmpty': 'ほかに接続中の友達がいません。',
  'chatRoom.inputPlaceholder': 'メッセージを入力',
  'chatRoom.waiting': '{name} の参加を待っています...',
} satisfies Partial<Record<keyof typeof en, string>>;
