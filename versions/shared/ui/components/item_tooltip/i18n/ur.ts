/** ur text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'قیمت: {amount}',
  'shop.noPrice': 'قیمت مقرر نہیں',
  'shop.priceTaxed': 'قیمت: {taxed} ({base})',
  'shop.sellPrice': 'فروخت کی قیمت: {amount}',
  'shop.repairCost': 'مرمت: {amount}',
  'petInfo.tipLevel': 'لیول : {level}',
  'petInfo.tipExperience': 'تجربہ : {value}',
  'petInfo.tipLife': 'زندگی : {current} / {max}',
  'item.equipped': 'پہنا ہوا',
} satisfies Partial<Record<keyof typeof en, string>>;
