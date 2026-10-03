/** Vietnamese text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled': 'Cửa hàng cá nhân đã bị tắt trên máy chủ này.',
  'personalShop.slotNotInShop': 'Ô đó không thuộc cửa hàng.',
  'personalShop.priceNotSet': 'Không thể đặt giá.',
} satisfies Partial<Record<keyof typeof en, string>>;
