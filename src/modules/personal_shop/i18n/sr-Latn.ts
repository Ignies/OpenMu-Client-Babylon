/** sr-Latn text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'Lične prodavnice su isključene na ovom serveru.',
  'personalShop.slotNotInShop': 'To polje nije deo prodavnice.',
  'personalShop.priceNotSet': 'Cena ne može da se postavi.',
} satisfies Partial<Record<keyof typeof en, string>>;
