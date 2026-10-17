/** cs text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Cena: {amount}',
  'shop.noPrice': 'Cena nenastavena',
  'shop.priceTaxed': 'Cena: {taxed} ({base})',
  'shop.sellPrice': 'Prodejní cena: {amount}',
  'shop.repairCost': 'Oprava: {amount}',
  'petInfo.tipLevel': 'Úroveň : {level}',
  'petInfo.tipExperience': 'Zkušenosti : {value}',
  'petInfo.tipLife': 'Život : {current} / {max}',
  'item.equipped': 'Nasazeno',
} satisfies Partial<Record<keyof typeof en, string>>;
