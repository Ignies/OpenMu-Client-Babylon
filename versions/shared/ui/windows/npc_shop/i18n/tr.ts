/** tr text of `versions/shared/ui/windows/npc_shop`. */

import type en from './en';

export default {
  'shop.title': 'Dükkan',
  'shop.repairAll': 'Tümünü onar',
  'shop.repair': 'Onar',
  'shop.tax': 'Satış vergisi: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
