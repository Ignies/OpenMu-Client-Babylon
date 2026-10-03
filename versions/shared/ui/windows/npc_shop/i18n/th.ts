/** Thai text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'ร้านค้า',
  'shop.repairAll': 'ซ่อมทั้งหมด',
  'shop.repair': 'ซ่อม',
  'shop.tax': 'ภาษีการขาย: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
