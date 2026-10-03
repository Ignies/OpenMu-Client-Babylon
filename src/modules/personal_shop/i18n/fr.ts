/** French text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled':
    'Les échoppes personnelles sont désactivées sur ce serveur.',
  'personalShop.slotNotInShop': 'Cette case ne fait pas partie de l’échoppe.',
  'personalShop.priceNotSet': 'Le prix n’a pas pu être fixé.',
} satisfies Partial<Record<keyof typeof en, string>>;
