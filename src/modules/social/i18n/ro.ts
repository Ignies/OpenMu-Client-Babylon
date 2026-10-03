/** Romanian text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Ai ieșit din grup.',
  'party.onlyLeaderInvites': 'Doar liderul grupului poate invita.',
  'party.full': 'Grupul este plin.',
  'party.invitationSent': 'Invitație de grup trimisă către {name}.',
  'guild.joinRequestSent': 'Cerere de guild trimisă către {name}.',
  'guild.onlyMasterAppoints': 'Doar maestrul guildului poate numi membri.',
  'guild.onlyMasterCan': 'Doar maestrul guildului poate face asta.',
  'guild.allianceRequestSent': 'Cerere de alianță trimisă către {name}.',
  'guild.hostilityRequestSent':
    'Declarație de rivalitate trimisă către {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
