/** fil text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Chat Room',
  'chatRoom.connecting': 'Kumokonekta sa chat server...',
  'chatRoom.closed': 'Nadiskonekta',
  'chatRoom.members': 'Mga Miyembro ({count})',
  'chatRoom.invite': 'Imbitahan',
  'chatRoom.inviteEmpty': 'Walang ibang kaibigang online.',
  'chatRoom.inputPlaceholder': 'Mag-type ng mensahe',
  'chatRoom.waiting': 'Hinihintay na sumali si {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
