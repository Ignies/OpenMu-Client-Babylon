/** Polish text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Pokój czatu',
  'chatRoom.connecting': 'Łączenie z serwerem czatu...',
  'chatRoom.closed': 'Rozłączono',
  'chatRoom.members': 'Uczestnicy ({count})',
  'chatRoom.invite': 'Zaproś',
  'chatRoom.inviteEmpty': 'Żaden inny znajomy nie jest online.',
  'chatRoom.inputPlaceholder': 'Wpisz wiadomość',
  'chatRoom.waiting': 'Oczekiwanie na dołączenie: {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
