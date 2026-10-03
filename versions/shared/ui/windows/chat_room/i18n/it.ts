/** Italian text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Stanza di chat',
  'chatRoom.connecting': 'Connessione al server di chat...',
  'chatRoom.closed': 'Disconnesso',
  'chatRoom.members': 'Membri ({count})',
  'chatRoom.invite': 'Invita',
  'chatRoom.inviteEmpty': 'Nessun altro amico è online.',
  'chatRoom.inputPlaceholder': 'Scrivi un messaggio',
  'chatRoom.waiting': 'In attesa che {name} entri...',
} satisfies Partial<Record<keyof typeof en, string>>;
