/** German text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Laden',
  'shop.repairAll': 'Alles reparieren',
  'shop.repair': 'Reparieren',
  'shop.tax': 'Verkaufssteuer: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
