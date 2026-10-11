/** German text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Du hast die Gruppe verlassen.',
  'party.onlyLeaderInvites': 'Nur der Gruppenleiter kann einladen.',
  'party.full': 'Die Gruppe ist voll.',
  'party.invitationSent': 'Gruppeneinladung an {name} gesendet.',
  'party.reply.on': 'Gruppeneinladungen: Du wirst gefragt.',
  'party.reply.off': 'Gruppeneinladungen: werden von selbst abgelehnt. /re on, um wieder gefragt zu werden.',
  'party.reply.auto': 'Gruppeneinladungen: werden von selbst angenommen. /re on, um wieder gefragt zu werden.',
  'party.reply.status': 'Gruppeneinladungen: /re {mode}. Nutze /re on, /re off oder /re auto.',
  'party.reply.declined': 'Gruppeneinladung von {name} abgelehnt (/re).',
  'party.reply.accepted': 'Gruppeneinladung von {name} angenommen (/re).',
  'guild.joinRequestSent': 'Gildenanfrage an {name} gesendet.',
  'guild.onlyMasterAppoints':
    'Nur der Gildenmeister kann Mitglieder ernennen.',
  'guild.onlyMasterCan': 'Nur der Gildenmeister kann das tun.',
  'guild.allianceRequestSent': 'Allianzanfrage an {name} gesendet.',
  'guild.hostilityRequestSent': 'Rivalitätserklärung an {name} gesendet.',
} satisfies Partial<Record<keyof typeof en, string>>;
