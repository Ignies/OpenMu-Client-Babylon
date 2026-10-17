/** tr text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Sohbet Odası',
  'chatRoom.connecting': 'Sohbet sunucusuna bağlanılıyor...',
  'chatRoom.closed': 'Bağlantı kesildi',
  'chatRoom.members': 'Üyeler ({count})',
  'chatRoom.invite': 'Davet et',
  'chatRoom.inviteEmpty': 'Çevrimiçi başka arkadaş yok.',
  'chatRoom.inputPlaceholder': 'Bir mesaj yaz',
  'chatRoom.waiting': '{name} adlı oyuncunun katılması bekleniyor...',
} satisfies Partial<Record<keyof typeof en, string>>;
