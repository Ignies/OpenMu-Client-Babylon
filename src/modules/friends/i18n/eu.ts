/** eu text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Ezin duzu zeure burua lagun gisa gehitu.',
  'friends.alreadyOnList': '{name} jokalaria zure lagun-zerrendan dago jada.',
  'friends.listFull': 'Zure lagun-zerrenda beteta dago.',
  'friends.requestSent': 'Lagun-eskaera bidali zaio {name} jokalariari.',
  'friends.requestFailed': 'Ezin izan da lagun-eskaera bidali.',
  'friends.added': '{name} jokalaria zure lagun-zerrendara gehitu da.',
  'friends.cannotLetterSelf': 'Ezin diozu zeure buruari gutunik bidali.',
  'friends.letterArrived': 'Gutun bat iritsi da. Igorlea: {name}.',
  'friends.letterDeleteFailed': 'Ezin izan da gutuna ezabatu.',
  'friends.letterSent': 'Gutuna bidali da.',
  'friends.letterTryAgain': 'Ezin izan da gutuna bidali. Saiatu berriro.',
  'friends.mailboxFull': 'Postontzi hori beteta dago.',
  'friends.noSuchCharacter': 'Ez dago izen hori duen pertsonaiarik.',
  'friends.letterNeedsZen': 'Ez duzu Zen nahikorik gutun bat bidaltzeko.',
  'friends.letterFailed': 'Ezin izan da gutuna bidali.',
} satisfies Partial<Record<keyof typeof en, string>>;
