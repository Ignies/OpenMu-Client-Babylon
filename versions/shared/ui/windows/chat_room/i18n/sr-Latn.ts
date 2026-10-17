/** sr-Latn text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Soba za čet',
  'chatRoom.connecting': 'Povezivanje sa serverom za čet...',
  'chatRoom.closed': 'Veza je prekinuta',
  'chatRoom.members': 'Učesnici ({count})',
  'chatRoom.invite': 'Pozovi',
  'chatRoom.inviteEmpty': 'Nijedan drugi prijatelj nije na mreži.',
  'chatRoom.inputPlaceholder': 'Unesi poruku',
  'chatRoom.waiting': 'Čeka se da se pridruži igrač {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
