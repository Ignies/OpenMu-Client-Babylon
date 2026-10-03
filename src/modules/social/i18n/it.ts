/** Italian text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Hai lasciato il gruppo.',
  'party.onlyLeaderInvites': 'Solo il capogruppo può invitare.',
  'party.full': 'Il gruppo è al completo.',
  'party.invitationSent': 'Invito al gruppo inviato a {name}.',
  'guild.joinRequestSent': 'Richiesta di gilda inviata a {name}.',
  'guild.onlyMasterAppoints':
    'Solo il master della gilda può nominare i membri.',
  'guild.onlyMasterCan': 'Solo il master della gilda può farlo.',
  'guild.allianceRequestSent': 'Richiesta di alleanza inviata a {name}.',
  'guild.hostilityRequestSent': 'Dichiarazione di rivalità inviata a {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
