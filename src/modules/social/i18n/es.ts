/** Spanish text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Has salido del grupo.',
  'party.onlyLeaderInvites': 'Solo el líder del grupo puede invitar.',
  'party.full': 'El grupo está lleno.',
  'party.invitationSent': 'Invitación de grupo enviada a {name}.',
  'guild.joinRequestSent': 'Solicitud de guild enviada a {name}.',
  'guild.onlyMasterAppoints':
    'Solo el máster del guild puede nombrar miembros.',
  'guild.onlyMasterCan': 'Solo el máster del guild puede hacer eso.',
  'guild.allianceRequestSent': 'Solicitud de alianza enviada a {name}.',
  'guild.hostilityRequestSent': 'Declaración de rivalidad enviada a {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
