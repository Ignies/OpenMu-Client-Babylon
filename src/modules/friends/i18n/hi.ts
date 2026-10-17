/** hi text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'आप खुद को दोस्त के रूप में नहीं जोड़ सकते।',
  'friends.alreadyOnList': 'खिलाड़ी {name} पहले से आपकी दोस्तों की सूची में है।',
  'friends.listFull': 'आपकी दोस्तों की सूची भरी हुई है।',
  'friends.requestSent': 'खिलाड़ी {name} को दोस्ती का अनुरोध भेजा गया।',
  'friends.requestFailed': 'दोस्ती का अनुरोध भेजा नहीं जा सका।',
  'friends.added': 'खिलाड़ी {name} को आपकी दोस्तों की सूची में जोड़ा गया।',
  'friends.cannotLetterSelf': 'आप खुद को चिट्ठी नहीं भेज सकते।',
  'friends.letterArrived': '{name} से एक चिट्ठी आई है।',
  'friends.letterDeleteFailed': 'चिट्ठी हटाई नहीं जा सकी।',
  'friends.letterSent': 'चिट्ठी भेज दी गई।',
  'friends.letterTryAgain': 'चिट्ठी भेजी नहीं जा सकी। फिर से कोशिश करें।',
  'friends.mailboxFull': 'वह मेलबॉक्स भरा हुआ है।',
  'friends.noSuchCharacter': 'उस नाम का कोई किरदार नहीं है।',
  'friends.letterNeedsZen': 'चिट्ठी भेजने के लिए आपके पास पर्याप्त Zen नहीं है।',
  'friends.letterFailed': 'चिट्ठी भेजी नहीं जा सकी।',
} satisfies Partial<Record<keyof typeof en, string>>;
