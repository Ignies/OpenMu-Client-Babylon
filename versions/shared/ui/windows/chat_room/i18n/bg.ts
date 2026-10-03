/** Bulgarian text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Чат стая',
  'chatRoom.connecting': 'Свързване с чат сървъра...',
  'chatRoom.closed': 'Прекъснато',
  'chatRoom.members': 'Участници ({count})',
  'chatRoom.invite': 'Покани',
  'chatRoom.inviteEmpty': 'Няма други приятели онлайн.',
  'chatRoom.inputPlaceholder': 'Напиши съобщение',
  'chatRoom.waiting': 'Изчакване {name} да влезе...',
} satisfies Partial<Record<keyof typeof en, string>>;
