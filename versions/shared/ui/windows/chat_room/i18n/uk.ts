/** uk text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Чат-кімната',
  'chatRoom.connecting': 'Підключення до чат-сервера...',
  'chatRoom.closed': 'Від’єднано',
  'chatRoom.members': 'Учасники ({count})',
  'chatRoom.invite': 'Запросити',
  'chatRoom.inviteEmpty': 'Інших друзів у мережі немає.',
  'chatRoom.inputPlaceholder': 'Введіть повідомлення',
  'chatRoom.waiting': 'Очікування, поки гравець {name} приєднається...',
} satisfies Partial<Record<keyof typeof en, string>>;
