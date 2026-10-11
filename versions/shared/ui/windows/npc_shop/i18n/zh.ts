/** Chinese text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': '商店',
  'shop.repairAll': '全部修理',
  'shop.repair': '修理',
  'shop.tax': '销售税：{rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
