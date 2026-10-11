/** Portuguese text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Sala de chat',
  'chatRoom.connecting': 'Conectando ao servidor de chat...',
  'chatRoom.closed': 'Desconectado',
  'chatRoom.members': 'Membros ({count})',
  'chatRoom.invite': 'Convidar',
  'chatRoom.inviteEmpty': 'Nenhum outro amigo está online.',
  'chatRoom.inputPlaceholder': 'Escreva uma mensagem',
  'chatRoom.waiting': 'Aguardando {name} entrar...',
} satisfies Partial<Record<keyof typeof en, string>>;
