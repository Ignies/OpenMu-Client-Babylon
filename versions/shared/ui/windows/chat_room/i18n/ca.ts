/** ca text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Sala de xat',
  'chatRoom.connecting': 'S\'està connectant al servidor de xat...',
  'chatRoom.closed': 'Desconnectat',
  'chatRoom.members': 'Membres ({count})',
  'chatRoom.invite': 'Convida',
  'chatRoom.inviteEmpty': 'No hi ha cap altre amic en línia.',
  'chatRoom.inputPlaceholder': 'Escriu un missatge',
  'chatRoom.waiting': 'S\'està esperant que el jugador {name} entri...',
} satisfies Partial<Record<keyof typeof en, string>>;
