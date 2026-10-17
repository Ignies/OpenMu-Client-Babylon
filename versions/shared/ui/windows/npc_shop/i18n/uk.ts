/** uk text of `versions/shared/ui/windows/npc_shop`. */

import type en from './en';

export default {
  'shop.title': 'Крамниця',
  'shop.repairAll': 'Полагодити все',
  'shop.repair': 'Полагодити',
  'shop.tax': 'Податок з продажу: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
