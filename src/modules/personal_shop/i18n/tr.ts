/** tr text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'Bu sunucuda kişisel dükkanlar kapalı.',
  'personalShop.slotNotInShop': 'O yuva dükkanın parçası değil.',
  'personalShop.priceNotSet': 'Fiyat belirlenemedi.',
} satisfies Partial<Record<keyof typeof en, string>>;
