/** fil text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Hindi mo maidaragdag ang sarili mo bilang kaibigan.',
  'friends.alreadyOnList': 'Nasa iyong listahan ng kaibigan na si {name}.',
  'friends.listFull': 'Puno na ang iyong listahan ng kaibigan.',
  'friends.requestSent': 'Naipadala ang kahilingang makipagkaibigan kay {name}.',
  'friends.requestFailed': 'Hindi maipadala ang kahilingang makipagkaibigan.',
  'friends.added': 'Naidagdag si {name} sa iyong listahan ng kaibigan.',
  'friends.cannotLetterSelf': 'Hindi ka makapagpapadala ng liham sa iyong sarili.',
  'friends.letterArrived': 'May dumating na liham mula kay {name}.',
  'friends.letterDeleteFailed': 'Hindi mabura ang liham.',
  'friends.letterSent': 'Naipadala ang liham.',
  'friends.letterTryAgain': 'Hindi maipadala ang liham. Subukan muli.',
  'friends.mailboxFull': 'Puno na ang mailbox na iyan.',
  'friends.noSuchCharacter': 'Walang karakter na may ganyang pangalan.',
  'friends.letterNeedsZen': 'Kulang ang iyong Zen para magpadala ng liham.',
  'friends.letterFailed': 'Hindi maipadala ang liham.',
} satisfies Partial<Record<keyof typeof en, string>>;
