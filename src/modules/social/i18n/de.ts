/** German text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Du hast die Gruppe verlassen.',
  'party.onlyLeaderInvites': 'Nur der Gruppenleiter kann einladen.',
  'party.full': 'Die Gruppe ist voll.',
  'party.invitationSent': 'Gruppeneinladung an {name} gesendet.',
  'guild.joinRequestSent': 'Gildenanfrage an {name} gesendet.',
  'guild.onlyMasterAppoints':
    'Nur der Gildenmeister kann Mitglieder ernennen.',
  'guild.onlyMasterCan': 'Nur der Gildenmeister kann das tun.',
  'guild.allianceRequestSent': 'Allianzanfrage an {name} gesendet.',
  'guild.hostilityRequestSent': 'Rivalitätserklärung an {name} gesendet.',
} satisfies Partial<Record<keyof typeof en, string>>;
