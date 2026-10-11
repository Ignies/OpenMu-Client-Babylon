/** Chinese text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled': '本服务器已关闭个人商店。',
  'personalShop.slotNotInShop': '该格子不属于商店。',
  'personalShop.priceNotSet': '价格设定失败。',
} satisfies Partial<Record<keyof typeof en, string>>;
