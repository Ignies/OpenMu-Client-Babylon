/** Spanish text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Tienda',
  'shop.repairAll': 'Reparar todo',
  'shop.repair': 'Reparar',
  'shop.tax': 'Impuesto de venta: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
