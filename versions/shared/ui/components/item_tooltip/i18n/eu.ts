/** eu text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Prezioa: {amount}',
  'shop.noPrice': 'Preziorik ez',
  'shop.priceTaxed': 'Prezioa: {taxed} ({base})',
  'shop.sellPrice': 'Salmenta-prezioa: {amount}',
  'shop.repairCost': 'Konponketa: {amount}',
  'petInfo.tipLevel': 'Maila: {level}',
  'petInfo.tipExperience': 'Esperientzia: {value}',
  'petInfo.tipLife': 'Bizitza: {current} / {max}',
  'item.equipped': 'Jantzita',
} satisfies Partial<Record<keyof typeof en, string>>;
