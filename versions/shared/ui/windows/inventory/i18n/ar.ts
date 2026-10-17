/** ar text of `versions/shared/ui/windows/inventory`. */

import type en from './en';

export default {
  'inventory.title': 'الحقيبة',
  'inventory.close': 'إغلاق (I,V)',
  'inventory.repair': 'إصلاح (L)',
  'inventory.personalShop': 'المتجر الشخصي',
  'inventory.expand': 'فتح الحقيبة الموسعة (K)',
} satisfies Partial<Record<keyof typeof en, string>>;
