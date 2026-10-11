/** Portuguese text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Você saiu do grupo.',
  'party.onlyLeaderInvites': 'Só o líder do grupo pode convidar.',
  'party.full': 'O grupo está cheio.',
  'party.invitationSent': 'Convite de grupo enviado para {name}.',
  'party.reply.on': 'Convites de grupo: você será perguntado.',
  'party.reply.off': 'Convites de grupo: recusados sozinhos. /re on para voltar a ser perguntado.',
  'party.reply.auto': 'Convites de grupo: aceitos sozinhos. /re on para voltar a ser perguntado.',
  'party.reply.status': 'Convites de grupo: /re {mode}. Use /re on, /re off ou /re auto.',
  'party.reply.declined': 'Convite de grupo de {name} recusado (/re).',
  'party.reply.accepted': 'Convite de grupo de {name} aceito (/re).',
  'guild.joinRequestSent': 'Pedido de guild enviado para {name}.',
  'guild.onlyMasterAppoints': 'Só o mestre da guild pode nomear membros.',
  'guild.onlyMasterCan': 'Só o mestre da guild pode fazer isso.',
  'guild.allianceRequestSent': 'Pedido de aliança enviado para {name}.',
  'guild.hostilityRequestSent':
    'Declaração de rivalidade enviada para {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
