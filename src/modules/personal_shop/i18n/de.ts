/** German text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled':
    'Eigene Läden sind auf diesem Server abgeschaltet.',
  'personalShop.slotNotInShop': 'Dieses Feld gehört nicht zum Laden.',
  'personalShop.priceNotSet': 'Der Preis konnte nicht gesetzt werden.',
} satisfies Partial<Record<keyof typeof en, string>>;
