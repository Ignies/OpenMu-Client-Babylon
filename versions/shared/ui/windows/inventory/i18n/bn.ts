/** bn text of `versions/shared/ui/windows/inventory`. */

import type en from './en';

export default {
  'inventory.title': 'ইনভেন্টরি',
  'inventory.close': 'বন্ধ (I,V)',
  'inventory.repair': 'মেরামত (L)',
  'inventory.personalShop': 'ব্যক্তিগত দোকান',
  'inventory.expand': 'বর্ধিত ইনভেন্টরি খুলুন (K)',
} satisfies Partial<Record<keyof typeof en, string>>;
