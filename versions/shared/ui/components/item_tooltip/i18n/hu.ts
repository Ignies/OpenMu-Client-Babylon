/** hu text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Ár: {amount}',
  'shop.noPrice': 'Nincs ár megadva',
  'shop.priceTaxed': 'Ár: {taxed} ({base})',
  'shop.sellPrice': 'Eladási ár: {amount}',
  'shop.repairCost': 'Javítás: {amount}',
  'petInfo.tipLevel': 'Szint: {level}',
  'petInfo.tipExperience': 'Tapasztalat: {value}',
  'petInfo.tipLife': 'Élet: {current} / {max}',
  'item.equipped': 'Felszerelve',
} satisfies Partial<Record<keyof typeof en, string>>;
