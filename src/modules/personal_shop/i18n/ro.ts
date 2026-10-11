/** Romanian text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled':
    'Magazinele personale sunt oprite pe acest server.',
  'personalShop.slotNotInShop': 'Acel loc nu face parte din magazin.',
  'personalShop.priceNotSet': 'Prețul nu a putut fi stabilit.',
} satisfies Partial<Record<keyof typeof en, string>>;
