/** Bulgarian text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled': 'Личните магазини са изключени на този сървър.',
  'personalShop.slotNotInShop': 'Това място не е част от магазина.',
  'personalShop.priceNotSet': 'Цената не можа да бъде зададена.',
} satisfies Partial<Record<keyof typeof en, string>>;
