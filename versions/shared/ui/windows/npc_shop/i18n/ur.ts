/** ur text of `versions/shared/ui/windows/npc_shop`. */

import type en from './en';

export default {
  'shop.title': 'دکان',
  'shop.repairAll': 'سب کی مرمت',
  'shop.repair': 'مرمت',
  'shop.tax': 'فروخت ٹیکس: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
