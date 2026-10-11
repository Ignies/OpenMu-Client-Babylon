/** Russian text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Чат-комната',
  'chatRoom.connecting': 'Подключение к чат-серверу...',
  'chatRoom.closed': 'Отключено',
  'chatRoom.members': 'Участники ({count})',
  'chatRoom.invite': 'Пригласить',
  'chatRoom.inviteEmpty': 'Других друзей в сети нет.',
  'chatRoom.inputPlaceholder': 'Введите сообщение',
  'chatRoom.waiting': 'Ожидание, пока {name} войдёт...',
} satisfies Partial<Record<keyof typeof en, string>>;
