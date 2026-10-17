/** ur text of `versions/shared/ui/windows/inventory`. */

import type en from './en';

export default {
  'inventory.title': 'سامان',
  'inventory.close': 'بند کریں (I,V)',
  'inventory.repair': 'مرمت (L)',
  'inventory.personalShop': 'ذاتی دکان',
  'inventory.expand': 'توسیعی سامان کھولیں (K)',
} satisfies Partial<Record<keyof typeof en, string>>;
