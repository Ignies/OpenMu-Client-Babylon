/** Romanian text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Nu te poți adăuga pe tine ca prieten.',
  'friends.alreadyOnList': '{name} este deja în lista ta de prieteni.',
  'friends.listFull': 'Lista ta de prieteni este plină.',
  'friends.requestSent': 'Cerere de prietenie trimisă către {name}.',
  'friends.requestFailed': 'Cererea de prietenie nu a putut fi trimisă.',
  'friends.added': '{name} a fost adăugat în lista ta de prieteni.',
  'friends.cannotLetterSelf': 'Nu îți poți trimite o scrisoare ție însuți.',
  'friends.letterArrived': 'A sosit o scrisoare de la {name}.',
  'friends.letterDeleteFailed': 'Scrisoarea nu a putut fi ștearsă.',
  'friends.letterSent': 'Scrisoarea a fost trimisă.',
  'friends.letterTryAgain':
    'Scrisoarea nu a putut fi trimisă. Încearcă din nou.',
  'friends.mailboxFull': 'Acea cutie poștală este plină.',
  'friends.noSuchCharacter': 'Nu există niciun personaj cu acest nume.',
  'friends.letterNeedsZen': 'Nu ai destul Zen ca să trimiți o scrisoare.',
  'friends.letterFailed': 'Scrisoarea nu a putut fi trimisă.',
} satisfies Partial<Record<keyof typeof en, string>>;
