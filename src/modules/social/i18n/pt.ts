/** Portuguese text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Você saiu do grupo.',
  'party.onlyLeaderInvites': 'Só o líder do grupo pode convidar.',
  'party.full': 'O grupo está cheio.',
  'party.invitationSent': 'Convite de grupo enviado para {name}.',
  'guild.joinRequestSent': 'Pedido de guild enviado para {name}.',
  'guild.onlyMasterAppoints': 'Só o mestre da guild pode nomear membros.',
  'guild.onlyMasterCan': 'Só o mestre da guild pode fazer isso.',
  'guild.allianceRequestSent': 'Pedido de aliança enviado para {name}.',
  'guild.hostilityRequestSent':
    'Declaração de rivalidade enviada para {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
