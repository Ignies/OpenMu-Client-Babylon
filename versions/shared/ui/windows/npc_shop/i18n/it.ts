/** Italian text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Negozio',
  'shop.repairAll': 'Ripara tutto',
  'shop.repair': 'Ripara',
  'shop.tax': 'Tassa di vendita: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
