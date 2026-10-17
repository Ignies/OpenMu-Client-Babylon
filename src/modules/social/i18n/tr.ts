/** tr text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Gruptan ayrıldın.',
  'party.onlyLeaderInvites': 'Yalnızca grup lideri davet edebilir.',
  'party.full': 'Grup dolu.',
  'party.invitationSent': '{name} adlı oyuncuya grup daveti gönderildi.',
  'guild.joinRequestSent': '{name} adlı oyuncuya loncaya katılma isteği gönderildi.',
  'guild.onlyMasterAppoints': 'Üyeleri yalnızca lonca lideri atayabilir.',
  'guild.onlyMasterCan': 'Bunu yalnızca lonca lideri yapabilir.',
  'guild.allianceRequestSent': '{name} adlı oyuncuya ittifak isteği gönderildi.',
  'guild.hostilityRequestSent': '{name} adlı oyuncuya düşmanlık isteği gönderildi.',
} satisfies Partial<Record<keyof typeof en, string>>;
