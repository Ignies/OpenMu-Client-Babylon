/** id text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Ruang Chat',
  'chatRoom.connecting': 'Menghubungkan ke server chat...',
  'chatRoom.closed': 'Terputus',
  'chatRoom.members': 'Anggota ({count})',
  'chatRoom.invite': 'Undang',
  'chatRoom.inviteEmpty': 'Tidak ada teman lain yang online.',
  'chatRoom.inputPlaceholder': 'Ketik pesan',
  'chatRoom.waiting': 'Menunggu {name} bergabung...',
} satisfies Partial<Record<keyof typeof en, string>>;
