/** Italian text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled':
    'I negozi personali sono disattivati su questo server.',
  'personalShop.slotNotInShop': 'Quella casella non fa parte del negozio.',
  'personalShop.priceNotSet': 'Non è stato possibile fissare il prezzo.',
} satisfies Partial<Record<keyof typeof en, string>>;
