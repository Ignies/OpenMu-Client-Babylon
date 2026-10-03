/** Spanish text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled':
    'Las tiendas personales están desactivadas en este servidor.',
  'personalShop.slotNotInShop': 'Esa casilla no es parte de la tienda.',
  'personalShop.priceNotSet': 'No se pudo fijar el precio.',
} satisfies Partial<Record<keyof typeof en, string>>;
