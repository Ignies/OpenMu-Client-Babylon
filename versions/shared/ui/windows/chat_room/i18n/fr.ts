/** French text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Salon de discussion',
  'chatRoom.connecting': 'Connexion au serveur de chat...',
  'chatRoom.closed': 'Déconnecté',
  'chatRoom.members': 'Membres ({count})',
  'chatRoom.invite': 'Inviter',
  'chatRoom.inviteEmpty': 'Aucun autre ami n’est connecté.',
  'chatRoom.inputPlaceholder': 'Écrivez un message',
  'chatRoom.waiting': 'En attente de {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
