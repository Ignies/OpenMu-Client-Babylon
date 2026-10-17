/** sr-Latn text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Više nisi u grupi.',
  'party.onlyLeaderInvites': 'Samo vođa grupe može da poziva.',
  'party.full': 'Grupa je puna.',
  'party.invitationSent': 'Poziv u grupu je poslat igraču {name}.',
  'guild.joinRequestSent': 'Zahtev za pridruživanje gildi je poslat igraču {name}.',
  'guild.onlyMasterAppoints': 'Samo majstor gilde može da imenuje članove.',
  'guild.onlyMasterCan': 'Samo majstor gilde može to da uradi.',
  'guild.allianceRequestSent': 'Zahtev za savez je poslat igraču {name}.',
  'guild.hostilityRequestSent': 'Objava neprijateljstva je poslata igraču {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
