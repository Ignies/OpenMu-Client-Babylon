/** Bulgarian text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Магазин',
  'shop.repairAll': 'Поправи всичко',
  'shop.repair': 'Поправи',
  'shop.tax': 'Данък при продажба: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
