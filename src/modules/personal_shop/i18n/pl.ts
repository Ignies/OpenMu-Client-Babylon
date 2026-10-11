/** Polish text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled': 'Sklepy osobiste są wyłączone na tym serwerze.',
  'personalShop.slotNotInShop': 'To pole nie należy do sklepu.',
  'personalShop.priceNotSet': 'Nie udało się ustawić ceny.',
} satisfies Partial<Record<keyof typeof en, string>>;
