/** Vietnamese text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Cửa hàng',
  'shop.repairAll': 'Sửa tất cả',
  'shop.repair': 'Sửa',
  'shop.tax': 'Thuế bán: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
