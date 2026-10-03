/** Polish text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Sklep',
  'shop.repairAll': 'Napraw wszystko',
  'shop.repair': 'Napraw',
  'shop.tax': 'Podatek od sprzedaży: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
