/** cs text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Vlastní postavu nelze přidat do přátel.',
  'friends.alreadyOnList': 'Hráč {name} už je na tvém seznamu přátel.',
  'friends.listFull': 'Tvůj seznam přátel je plný.',
  'friends.requestSent': 'Žádost o přátelství odeslána hráči {name}.',
  'friends.requestFailed': 'Žádost o přátelství nelze odeslat.',
  'friends.added': 'Hráč {name} byl přidán na tvůj seznam přátel.',
  'friends.cannotLetterSelf': 'Vlastní postavě nelze poslat dopis.',
  'friends.letterArrived': 'Přišel dopis od hráče {name}.',
  'friends.letterDeleteFailed': 'Dopis nelze smazat.',
  'friends.letterSent': 'Dopis byl odeslán.',
  'friends.letterTryAgain': 'Dopis nelze odeslat. Zkus to znovu.',
  'friends.mailboxFull': 'Tato schránka je plná.',
  'friends.noSuchCharacter': 'Postava s tímto jménem neexistuje.',
  'friends.letterNeedsZen': 'Na odeslání dopisu nemáš dost Zen.',
  'friends.letterFailed': 'Dopis nelze odeslat.',
} satisfies Partial<Record<keyof typeof en, string>>;
