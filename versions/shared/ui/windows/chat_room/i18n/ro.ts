/** Romanian text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Cameră de chat',
  'chatRoom.connecting': 'Se conectează la serverul de chat...',
  'chatRoom.closed': 'Deconectat',
  'chatRoom.members': 'Membri ({count})',
  'chatRoom.invite': 'Invită',
  'chatRoom.inviteEmpty': 'Niciun alt prieten nu este online.',
  'chatRoom.inputPlaceholder': 'Scrie un mesaj',
  'chatRoom.waiting': 'Se așteaptă ca {name} să intre...',
} satisfies Partial<Record<keyof typeof en, string>>;
