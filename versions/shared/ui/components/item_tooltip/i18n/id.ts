/** id text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Harga: {amount}',
  'shop.noPrice': 'Harga belum diatur',
  'shop.priceTaxed': 'Harga: {taxed} ({base})',
  'shop.sellPrice': 'Harga jual: {amount}',
  'shop.repairCost': 'Perbaikan: {amount}',
  'petInfo.tipLevel': 'Level : {level}',
  'petInfo.tipExperience': 'Pengalaman : {value}',
  'petInfo.tipLife': 'Nyawa : {current} / {max}',
  'item.equipped': 'Dipakai',
} satisfies Partial<Record<keyof typeof en, string>>;
