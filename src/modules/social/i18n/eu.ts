/** eu text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Taldea utzi duzu.',
  'party.onlyLeaderInvites': 'Taldeburuak bakarrik gonbida dezake.',
  'party.full': 'Taldea beteta dago.',
  'party.invitationSent': 'Talde-gonbidapena bidali zaio {name} jokalariari.',
  'guild.joinRequestSent': 'Gremioan sartzeko eskaera bidali zaio {name} jokalariari.',
  'guild.onlyMasterAppoints': 'Gremio-buruak bakarrik izenda ditzake kideak.',
  'guild.onlyMasterCan': 'Gremio-buruak bakarrik egin dezake hori.',
  'guild.allianceRequestSent': 'Aliantza-eskaera bidali zaio {name} jokalariari.',
  'guild.hostilityRequestSent': 'Etsaitasun-eskaera bidali zaio {name} jokalariari.',
} satisfies Partial<Record<keyof typeof en, string>>;
