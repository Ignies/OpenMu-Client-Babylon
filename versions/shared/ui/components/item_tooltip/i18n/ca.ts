/** ca text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Preu: {amount}',
  'shop.noPrice': 'Sense preu',
  'shop.priceTaxed': 'Preu: {taxed} ({base})',
  'shop.sellPrice': 'Preu de venda: {amount}',
  'shop.repairCost': 'Reparació: {amount}',
  'petInfo.tipLevel': 'Nivell: {level}',
  'petInfo.tipExperience': 'Experiència: {value}',
  'petInfo.tipLife': 'Vida: {current} / {max}',
  'item.equipped': 'Equipat',
} satisfies Partial<Record<keyof typeof en, string>>;
