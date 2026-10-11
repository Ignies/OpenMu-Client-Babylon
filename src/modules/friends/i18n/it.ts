/** Italian text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Non puoi aggiungere te stesso agli amici.',
  'friends.alreadyOnList': '{name} è già nella tua lista amici.',
  'friends.listFull': 'La tua lista amici è piena.',
  'friends.requestSent': 'Richiesta di amicizia inviata a {name}.',
  'friends.requestFailed':
    'Non è stato possibile inviare la richiesta di amicizia.',
  'friends.added': '{name} è stato aggiunto alla tua lista amici.',
  'friends.cannotLetterSelf': 'Non puoi inviare una lettera a te stesso.',
  'friends.letterArrived': 'È arrivata una lettera da {name}.',
  'friends.letterDeleteFailed': 'Non è stato possibile eliminare la lettera.',
  'friends.letterSent': 'La lettera è stata inviata.',
  'friends.letterTryAgain':
    'Non è stato possibile inviare la lettera. Riprova.',
  'friends.mailboxFull': 'Quella casella è piena.',
  'friends.noSuchCharacter': 'Non esiste nessun personaggio con quel nome.',
  'friends.letterNeedsZen': 'Non hai abbastanza Zen per inviare una lettera.',
  'friends.letterFailed': 'Non è stato possibile inviare la lettera.',
} satisfies Partial<Record<keyof typeof en, string>>;
