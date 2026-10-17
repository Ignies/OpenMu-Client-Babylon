/** fil text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'Naka-off ang mga personal na tindahan sa server na ito.',
  'personalShop.slotNotInShop': 'Hindi bahagi ng tindahan ang puwestong iyan.',
  'personalShop.priceNotSet': 'Hindi maitakda ang presyo.',
} satisfies Partial<Record<keyof typeof en, string>>;
