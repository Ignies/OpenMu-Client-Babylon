/** ar text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'السعر: {amount}',
  'shop.noPrice': 'لم يحدد سعر',
  'shop.priceTaxed': 'السعر: {taxed} ({base})',
  'shop.sellPrice': 'سعر البيع: {amount}',
  'shop.repairCost': 'الإصلاح: {amount}',
  'petInfo.tipLevel': 'المستوى : {level}',
  'petInfo.tipExperience': 'الخبرة : {value}',
  'petInfo.tipLife': 'الحياة : {current} / {max}',
  'item.equipped': 'ملبوس',
} satisfies Partial<Record<keyof typeof en, string>>;
