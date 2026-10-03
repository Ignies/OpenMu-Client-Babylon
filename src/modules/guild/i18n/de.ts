/** German text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} hat die Gilde verlassen.',
  'guild.youLeft': 'Du hast die Gilde verlassen.',
  'guild.disbanded': 'Die Gilde wurde aufgelöst.',
  'guild.memberRemoved': 'Das Mitglied wurde aus der Gilde entfernt.',
  'guild.onlyMasterRemoves':
    'Nur der Gildenmeister kann Mitglieder entfernen.',
  'guild.wrongPassword': 'Das eingegebene Passwort ist falsch.',
  'guild.created': 'Die Gilde wurde gegründet.',
  'guild.nameTaken': 'Dieser Gildenname ist bereits vergeben.',
  'guild.createFailed': 'Die Gilde konnte nicht gegründet werden.',
  'guild.joinRefused': 'Der Gildenmeister hat deine Anfrage abgelehnt.',
  'guild.joined': 'Du bist der Gilde beigetreten.',
  'guild.isFull': 'Die Gilde ist voll.',
  'guild.masterUnavailable': 'Der Gildenmeister ist nicht erreichbar.',
  'guild.masterBusy':
    'Der Gildenmeister ist beschäftigt. Versuche es später.',
  'guild.needLevel6': 'Du brauchst mindestens Level 6 für eine Gilde.',
} satisfies Partial<Record<keyof typeof en, string>>;
