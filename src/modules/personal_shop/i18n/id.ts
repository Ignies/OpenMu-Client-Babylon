/** id text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'Toko pribadi dinonaktifkan di server ini.',
  'personalShop.slotNotInShop': 'Slot itu bukan bagian dari toko.',
  'personalShop.priceNotSet': 'Harga tidak dapat diatur.',
} satisfies Partial<Record<keyof typeof en, string>>;
