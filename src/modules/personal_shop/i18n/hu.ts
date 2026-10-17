/** hu text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'Ezen a szerveren a saját boltok ki vannak kapcsolva.',
  'personalShop.slotNotInShop': 'Ez a hely nem tartozik a bolthoz.',
  'personalShop.priceNotSet': 'Az árat nem sikerült beállítani.',
} satisfies Partial<Record<keyof typeof en, string>>;
