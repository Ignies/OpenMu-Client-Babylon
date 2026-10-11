/** Portuguese text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} saiu da guild.',
  'guild.youLeft': 'Você saiu da guild.',
  'guild.disbanded': 'A guild foi dissolvida.',
  'guild.memberRemoved': 'O membro foi removido da guild.',
  'guild.onlyMasterRemoves': 'Só o mestre da guild pode remover membros.',
  'guild.wrongPassword': 'A senha que você digitou está incorreta.',
  'guild.created': 'A guild foi criada.',
  'guild.nameTaken': 'Esse nome de guild já está em uso.',
  'guild.createFailed': 'Não foi possível criar a guild.',
  'guild.joinRefused': 'O mestre da guild recusou seu pedido.',
  'guild.joined': 'Você entrou na guild.',
  'guild.isFull': 'A guild está cheia.',
  'guild.masterUnavailable': 'O mestre da guild não está disponível.',
  'guild.masterBusy': 'O mestre da guild está ocupado. Tente mais tarde.',
  'guild.needLevel6':
    'Você precisa de pelo menos nível 6 para entrar em uma guild.',
} satisfies Partial<Record<keyof typeof en, string>>;
