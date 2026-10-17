/** hu text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Csevegőszoba',
  'chatRoom.connecting': 'Csatlakozás a csevegőszerverhez...',
  'chatRoom.closed': 'Kapcsolat bontva',
  'chatRoom.members': 'Tagok ({count})',
  'chatRoom.invite': 'Meghívás',
  'chatRoom.inviteEmpty': 'Nincs más barát online.',
  'chatRoom.inputPlaceholder': 'Írj üzenetet',
  'chatRoom.waiting': 'Várakozás, amíg csatlakozik: {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
