/** Japanese text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'ショップ',
  'shop.repairAll': 'すべて修理',
  'shop.repair': '修理',
  'shop.tax': '販売税: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
