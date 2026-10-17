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
  'party.reply.on': 'Pozivi u grupu: bićeš upitan.',
  'party.reply.off': 'Pozivi u grupu: odbijaju se sami. /re on da te ponovo pita.',
  'party.reply.auto': 'Pozivi u grupu: prihvataju se sami. /re on da te ponovo pita.',
  'party.reply.status': 'Pozivi u grupu: /re {mode}. Koristi /re on, /re off ili /re auto.',
  'party.reply.declined': 'Poziv u grupu od igrača {name} je odbijen (/re).',
  'party.reply.accepted': 'Poziv u grupu od igrača {name} je prihvaćen (/re).',
} satisfies Partial<Record<keyof typeof en, string>>;
