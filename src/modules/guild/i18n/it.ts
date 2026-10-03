/** Italian text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} ha lasciato la gilda.',
  'guild.youLeft': 'Hai lasciato la gilda.',
  'guild.disbanded': 'La gilda è stata sciolta.',
  'guild.memberRemoved': 'Il membro è stato espulso dalla gilda.',
  'guild.onlyMasterRemoves':
    'Solo il master della gilda può espellere i membri.',
  'guild.wrongPassword': 'La password inserita non è corretta.',
  'guild.created': 'La gilda è stata creata.',
  'guild.nameTaken': 'Quel nome di gilda è già in uso.',
  'guild.createFailed': 'Non è stato possibile creare la gilda.',
  'guild.joinRefused': 'Il master della gilda ha rifiutato la tua richiesta.',
  'guild.joined': 'Sei entrato nella gilda.',
  'guild.isFull': 'La gilda è al completo.',
  'guild.masterUnavailable': 'Il master della gilda non è disponibile.',
  'guild.masterBusy': 'Il master della gilda è occupato. Riprova più tardi.',
  'guild.needLevel6': 'Serve almeno il livello 6 per entrare in una gilda.',
} satisfies Partial<Record<keyof typeof en, string>>;
