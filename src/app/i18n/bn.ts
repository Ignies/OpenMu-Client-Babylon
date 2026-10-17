/** bn text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket সংযোগে ত্রুটি',
  'notify.connectionLost': 'সার্ভারের সাথে সংযোগ বিচ্ছিন্ন হয়েছে',
  'notify.serverListLost': 'সার্ভার তালিকার সাথে সংযোগ বিচ্ছিন্ন হয়েছে',
  'notify.helperStarted': 'MU Helper চালু হয়েছে',
  'notify.helperStopped': 'MU Helper বন্ধ হয়েছে',
  'notify.helperSafeZone': 'নিরাপদ এলাকায় MU Helper চালু করা যায় না',
  'notify.helperCost': 'MU Helper খরচ করেছে {total} Zen',
  'notify.zenCap': 'আপনি 2,000,000,000 Zen-এর বেশি বহন করতে পারবেন না',
  'notify.cannotSell': 'এই আইটেম বিক্রি করা যায় না',
  'notify.merchantRefuses': 'বণিক ওই আইটেম নিতে চান না',
  'notify.learnedSkill': 'আপনি শিখেছেন: {name}',
  'notify.storageOpen': 'ভান্ডার খোলা থাকা অবস্থায় আইটেম ব্যবহার করা যায় না',
  'notify.upgradeNeedsServer': 'উন্নীত করতে সার্ভার দরকার',
  'notify.noAnswerRestored': 'সার্ভার সাড়া দেয়নি - আইটেম ফিরিয়ে আনা হয়েছে',
  'notify.cannotBuy': 'আপনি ওই আইটেম কিনতে পারবেন না',
  'notify.updateAvailable': 'নতুন সংস্করণ এসেছে: সার্ভার তালিকায় ফিরলেই পেজটি একবার রিলোড হবে।',
} satisfies Partial<Record<keyof typeof en, string>>;
