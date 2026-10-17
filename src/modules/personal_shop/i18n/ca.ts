/** ca text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'Les botigues personals estan desactivades en aquest servidor.',
  'personalShop.slotNotInShop': 'Aquesta casella no forma part de la botiga.',
  'personalShop.priceNotSet': 'No s\'ha pogut fixar el preu.',
} satisfies Partial<Record<keyof typeof en, string>>;
