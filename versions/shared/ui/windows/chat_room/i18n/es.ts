/** Spanish text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Sala de chat',
  'chatRoom.connecting': 'Conectando con el servidor de chat...',
  'chatRoom.closed': 'Desconectado',
  'chatRoom.members': 'Miembros ({count})',
  'chatRoom.invite': 'Invitar',
  'chatRoom.inviteEmpty': 'No hay más amigos conectados.',
  'chatRoom.inputPlaceholder': 'Escribe un mensaje',
  'chatRoom.waiting': 'Esperando a que {name} entre...',
} satisfies Partial<Record<keyof typeof en, string>>;
