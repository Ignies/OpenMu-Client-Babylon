/** bn text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'আপনি নিজেকে বন্ধু হিসেবে যোগ করতে পারবেন না।',
  'friends.alreadyOnList': 'খেলোয়াড় {name} ইতিমধ্যে আপনার বন্ধু তালিকায় আছেন।',
  'friends.listFull': 'আপনার বন্ধু তালিকা পূর্ণ।',
  'friends.requestSent': 'বন্ধুত্বের অনুরোধ পাঠানো হয়েছে: {name}।',
  'friends.requestFailed': 'বন্ধুত্বের অনুরোধ পাঠানো যায়নি।',
  'friends.added': 'খেলোয়াড় {name} আপনার বন্ধু তালিকায় যুক্ত হয়েছেন।',
  'friends.cannotLetterSelf': 'আপনি নিজেকে চিঠি পাঠাতে পারবেন না।',
  'friends.letterArrived': 'একটি চিঠি এসেছে, প্রেরক: {name}।',
  'friends.letterDeleteFailed': 'চিঠিটি মোছা যায়নি।',
  'friends.letterSent': 'চিঠি পাঠানো হয়েছে।',
  'friends.letterTryAgain': 'চিঠি পাঠানো যায়নি। আবার চেষ্টা করুন।',
  'friends.mailboxFull': 'ওই চিঠির বাক্স পূর্ণ।',
  'friends.noSuchCharacter': 'এই নামে কোনো চরিত্র নেই।',
  'friends.letterNeedsZen': 'চিঠি পাঠানোর মতো যথেষ্ট Zen আপনার নেই।',
  'friends.letterFailed': 'চিঠি পাঠানো যায়নি।',
} satisfies Partial<Record<keyof typeof en, string>>;
