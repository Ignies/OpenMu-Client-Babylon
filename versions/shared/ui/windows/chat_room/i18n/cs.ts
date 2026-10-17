/** cs text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Chatovací místnost',
  'chatRoom.connecting': 'Připojování k chatovacímu serveru...',
  'chatRoom.closed': 'Odpojeno',
  'chatRoom.members': 'Účastníci ({count})',
  'chatRoom.invite': 'Pozvat',
  'chatRoom.inviteEmpty': 'Žádní další přátelé nejsou online.',
  'chatRoom.inputPlaceholder': 'Napiš zprávu',
  'chatRoom.waiting': 'Čekání na připojení hráče {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
