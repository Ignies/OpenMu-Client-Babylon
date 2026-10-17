/** hi text of `versions/shared/ui/windows/npc_shop`. */

import type en from './en';

export default {
  'shop.title': 'दुकान',
  'shop.repairAll': 'सबकी मरम्मत करें',
  'shop.repair': 'मरम्मत करें',
  'shop.tax': 'बिक्री कर: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
