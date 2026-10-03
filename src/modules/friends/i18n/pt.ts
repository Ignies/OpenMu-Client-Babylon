/** Portuguese text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Você não pode adicionar a si mesmo como amigo.',
  'friends.alreadyOnList': '{name} já está na sua lista de amigos.',
  'friends.listFull': 'Sua lista de amigos está cheia.',
  'friends.requestSent': 'Pedido de amizade enviado para {name}.',
  'friends.requestFailed': 'Não foi possível enviar o pedido de amizade.',
  'friends.added': '{name} foi adicionado à sua lista de amigos.',
  'friends.cannotLetterSelf': 'Você não pode enviar uma carta para si mesmo.',
  'friends.letterArrived': 'Chegou uma carta de {name}.',
  'friends.letterDeleteFailed': 'Não foi possível apagar a carta.',
  'friends.letterSent': 'A carta foi enviada.',
  'friends.letterTryAgain': 'Não foi possível enviar a carta. Tente de novo.',
  'friends.mailboxFull': 'Essa caixa de correio está cheia.',
  'friends.noSuchCharacter': 'Não existe personagem com esse nome.',
  'friends.letterNeedsZen':
    'Você não tem Zen suficiente para enviar uma carta.',
  'friends.letterFailed': 'Não foi possível enviar a carta.',
} satisfies Partial<Record<keyof typeof en, string>>;
