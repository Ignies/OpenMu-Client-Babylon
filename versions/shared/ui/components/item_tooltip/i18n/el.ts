/** el text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Τιμή: {amount}',
  'shop.noPrice': 'Χωρίς τιμή',
  'shop.priceTaxed': 'Τιμή: {taxed} ({base})',
  'shop.sellPrice': 'Τιμή πώλησης: {amount}',
  'shop.repairCost': 'Επισκευή: {amount}',
  'petInfo.tipLevel': 'Επίπεδο: {level}',
  'petInfo.tipExperience': 'Εμπειρία: {value}',
  'petInfo.tipLife': 'Ζωή: {current} / {max}',
  'item.equipped': 'Σε χρήση',
} satisfies Partial<Record<keyof typeof en, string>>;
