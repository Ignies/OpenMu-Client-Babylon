/** French text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Boutique',
  'shop.repairAll': 'Tout réparer',
  'shop.repair': 'Réparer',
  'shop.tax': 'Taxe de vente : {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
