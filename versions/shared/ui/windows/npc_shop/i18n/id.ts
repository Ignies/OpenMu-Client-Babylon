/** id text of `versions/shared/ui/windows/npc_shop`. */

import type en from './en';

export default {
  'shop.title': 'Toko',
  'shop.repairAll': 'Perbaiki semua',
  'shop.repair': 'Perbaiki',
  'shop.tax': 'Pajak penjualan: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
