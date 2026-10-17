/** tr text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Fiyat: {amount}',
  'shop.noPrice': 'Fiyat belirlenmedi',
  'shop.priceTaxed': 'Fiyat: {taxed} ({base})',
  'shop.sellPrice': 'Satış fiyatı: {amount}',
  'shop.repairCost': 'Onarım: {amount}',
  'petInfo.tipLevel': 'Seviye : {level}',
  'petInfo.tipExperience': 'Deneyim : {value}',
  'petInfo.tipLife': 'Can : {current} / {max}',
  'item.equipped': 'Kuşanıldı',
} satisfies Partial<Record<keyof typeof en, string>>;
