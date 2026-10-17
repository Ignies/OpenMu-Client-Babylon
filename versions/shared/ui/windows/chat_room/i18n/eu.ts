/** eu text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Txat-gela',
  'chatRoom.connecting': 'Txat-zerbitzarira konektatzen...',
  'chatRoom.closed': 'Deskonektatuta',
  'chatRoom.members': 'Kideak ({count})',
  'chatRoom.invite': 'Gonbidatu',
  'chatRoom.inviteEmpty': 'Ez dago beste lagunik linean.',
  'chatRoom.inputPlaceholder': 'Idatzi mezu bat',
  'chatRoom.waiting': '{name} jokalaria sartzeko zain...',
} satisfies Partial<Record<keyof typeof en, string>>;
