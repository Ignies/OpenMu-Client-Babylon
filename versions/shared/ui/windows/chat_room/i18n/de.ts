/** German text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Chatraum',
  'chatRoom.connecting': 'Verbinde mit dem Chatserver...',
  'chatRoom.closed': 'Getrennt',
  'chatRoom.members': 'Mitglieder ({count})',
  'chatRoom.invite': 'Einladen',
  'chatRoom.inviteEmpty': 'Kein weiterer Freund ist online.',
  'chatRoom.inputPlaceholder': 'Schreibe eine Nachricht',
  'chatRoom.waiting': 'Warte darauf, dass {name} beitritt...',
} satisfies Partial<Record<keyof typeof en, string>>;
