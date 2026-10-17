/** ar text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'المتاجر الشخصية معطلة على هذا الخادم.',
  'personalShop.slotNotInShop': 'هذه الخانة ليست جزءا من المتجر.',
  'personalShop.priceNotSet': 'تعذر تحديد السعر.',
} satisfies Partial<Record<keyof typeof en, string>>;
