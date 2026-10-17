/** sr-Latn text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Ne možeš dodati sebe za prijatelja.',
  'friends.alreadyOnList': 'Igrač {name} je već na tvojoj listi prijatelja.',
  'friends.listFull': 'Tvoja lista prijatelja je puna.',
  'friends.requestSent': 'Zahtev za prijateljstvo je poslat igraču {name}.',
  'friends.requestFailed': 'Zahtev za prijateljstvo ne može da se pošalje.',
  'friends.added': 'Igrač {name} je dodat na tvoju listu prijatelja.',
  'friends.cannotLetterSelf': 'Ne možeš poslati pismo sebi.',
  'friends.letterArrived': 'Stiglo je pismo od igrača {name}.',
  'friends.letterDeleteFailed': 'Pismo ne može da se obriše.',
  'friends.letterSent': 'Pismo je poslato.',
  'friends.letterTryAgain': 'Pismo ne može da se pošalje. Pokušaj ponovo.',
  'friends.mailboxFull': 'To poštansko sanduče je puno.',
  'friends.noSuchCharacter': 'Ne postoji lik sa tim imenom.',
  'friends.letterNeedsZen': 'Nemaš dovoljno Zen za slanje pisma.',
  'friends.letterFailed': 'Pismo ne može da se pošalje.',
} satisfies Partial<Record<keyof typeof en, string>>;
