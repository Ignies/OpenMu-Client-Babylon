/** cs text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'Osobní obchody jsou na tomto serveru vypnuté.',
  'personalShop.slotNotInShop': 'Toto pole nepatří k obchodu.',
  'personalShop.priceNotSet': 'Cenu nelze nastavit.',
} satisfies Partial<Record<keyof typeof en, string>>;
