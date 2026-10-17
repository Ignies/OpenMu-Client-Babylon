/** bn text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'ব্যক্তিগত দোকানের জন্য চরিত্রের লেভেল 6 দরকার।',
  'personalShop.openFailed': 'দোকান খোলা যায়নি।',
  'personalShop.cannotSell': 'এই আইটেম দোকানে বিক্রি করা যায় না।',
  'personalShop.itemGone': 'ওই আইটেমটি আর নেই।',
  'guild.alreadyInGuild': 'আপনি ইতিমধ্যে একটি গিল্ডের সদস্য।',
  'guild.notGuildMaster': 'ওই খেলোয়াড় গিল্ড মাস্টার নন।',
  'guild.requestFailed': 'গিল্ডের অনুরোধ ব্যর্থ হয়েছে।',
  'quest.itemFallback': 'আইটেম {id}',
  'event.shortOfZen': 'আপনার Zen কম পড়েছে।',
  'notify.negativePrice': 'দাম ঋণাত্মক হতে পারে না',
} satisfies Partial<Record<keyof typeof en, string>>;
