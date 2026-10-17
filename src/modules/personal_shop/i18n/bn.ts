/** bn text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'এই সার্ভারে ব্যক্তিগত দোকান বন্ধ রাখা হয়েছে।',
  'personalShop.slotNotInShop': 'ওই ঘরটি দোকানের অংশ নয়।',
  'personalShop.priceNotSet': 'দাম ঠিক করা যায়নি।',
} satisfies Partial<Record<keyof typeof en, string>>;
