/** Spanish text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'No puedes añadirte a ti mismo como amigo.',
  'friends.alreadyOnList': '{name} ya está en tu lista de amigos.',
  'friends.listFull': 'Tu lista de amigos está llena.',
  'friends.requestSent': 'Solicitud de amistad enviada a {name}.',
  'friends.requestFailed': 'No se pudo enviar la solicitud de amistad.',
  'friends.added': '{name} se ha añadido a tu lista de amigos.',
  'friends.cannotLetterSelf': 'No puedes enviarte una carta a ti mismo.',
  'friends.letterArrived': 'Ha llegado una carta de {name}.',
  'friends.letterDeleteFailed': 'No se pudo borrar la carta.',
  'friends.letterSent': 'La carta se ha enviado.',
  'friends.letterTryAgain': 'No se pudo enviar la carta. Inténtalo otra vez.',
  'friends.mailboxFull': 'Ese buzón está lleno.',
  'friends.noSuchCharacter': 'No hay ningún personaje con ese nombre.',
  'friends.letterNeedsZen': 'No tienes suficiente Zen para enviar una carta.',
  'friends.letterFailed': 'No se pudo enviar la carta.',
} satisfies Partial<Record<keyof typeof en, string>>;
