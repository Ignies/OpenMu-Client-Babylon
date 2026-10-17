/** bn text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'দাম: {amount}',
  'shop.noPrice': 'দাম ঠিক করা নেই',
  'shop.priceTaxed': 'দাম: {taxed} ({base})',
  'shop.sellPrice': 'বিক্রয় মূল্য: {amount}',
  'shop.repairCost': 'মেরামত: {amount}',
  'petInfo.tipLevel': 'লেভেল : {level}',
  'petInfo.tipExperience': 'অভিজ্ঞতা : {value}',
  'petInfo.tipLife': 'জীবন : {current} / {max}',
  'item.equipped': 'সজ্জিত',
} satisfies Partial<Record<keyof typeof en, string>>;
