/** zh-Hant text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': '此伺服器已關閉個人商店功能。',
  'personalShop.slotNotInShop': '該格子不屬於商店。',
  'personalShop.priceNotSet': '無法設定價格。',
} satisfies Partial<Record<keyof typeof en, string>>;
