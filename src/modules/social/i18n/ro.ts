/** Romanian text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Ai ieșit din grup.',
  'party.onlyLeaderInvites': 'Doar liderul grupului poate invita.',
  'party.full': 'Grupul este plin.',
  'party.invitationSent': 'Invitație de grup trimisă către {name}.',
  'party.reply.on': 'Invitații în grup: vei fi întrebat.',
  'party.reply.off': 'Invitații în grup: refuzate singure. /re on ca să fii întrebat din nou.',
  'party.reply.auto': 'Invitații în grup: acceptate singure. /re on ca să fii întrebat din nou.',
  'party.reply.status': 'Invitații în grup: /re {mode}. Folosește /re on, /re off sau /re auto.',
  'party.reply.declined': 'Invitația în grup de la {name} a fost refuzată (/re).',
  'party.reply.accepted': 'Invitația în grup de la {name} a fost acceptată (/re).',
  'guild.joinRequestSent': 'Cerere de guild trimisă către {name}.',
  'guild.onlyMasterAppoints': 'Doar maestrul guildului poate numi membri.',
  'guild.onlyMasterCan': 'Doar maestrul guildului poate face asta.',
  'guild.allianceRequestSent': 'Cerere de alianță trimisă către {name}.',
  'guild.hostilityRequestSent':
    'Declarație de rivalitate trimisă către {name}.',
  'stats.added': '{amount} puncte adăugate la {stat}.',
  'stats.name.str': 'Forță',
  'stats.name.agi': 'Agilitate',
  'stats.name.vit': 'Vitalitate',
  'stats.name.ene': 'Energie',
  'stats.name.cmd': 'Comandă',
} satisfies Partial<Record<keyof typeof en, string>>;
