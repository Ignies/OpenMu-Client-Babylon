/** Russian text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Магазин',
  'shop.repairAll': 'Починить всё',
  'shop.repair': 'Починить',
  'shop.tax': 'Налог с продажи: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
