/** fa text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'فروشگاه‌های شخصی در این سرور خاموش است.',
  'personalShop.slotNotInShop': 'این خانه بخشی از فروشگاه نیست.',
  'personalShop.priceNotSet': 'تعیین قیمت ممکن نشد.',
} satisfies Partial<Record<keyof typeof en, string>>;
