/** Portuguese text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Preço: {amount}',
  'shop.noPrice': 'Sem preço',
  'shop.priceTaxed': 'Preço: {taxed} ({base})',
  'shop.sellPrice': 'Preço de venda: {amount}',
  'shop.repairCost': 'Reparo: {amount}',
  'petInfo.tipLevel': 'Nível : {level}',
  'petInfo.tipExperience': 'Experiência : {value}',
  'petInfo.tipLife': 'Vida : {current} / {max}',
  'item.equipped': 'Equipado',
} satisfies Partial<Record<keyof typeof en, string>>;
