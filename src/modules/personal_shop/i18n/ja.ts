/** Japanese text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled': 'このサーバーでは個人商店が無効です。',
  'personalShop.slotNotInShop': 'その枠は商店の一部ではありません。',
  'personalShop.priceNotSet': '価格を設定できませんでした。',
} satisfies Partial<Record<keyof typeof en, string>>;
