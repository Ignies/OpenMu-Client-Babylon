/** Romanian text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Preț: {amount}',
  'shop.noPrice': 'Fără preț',
  'shop.priceTaxed': 'Preț: {taxed} ({base})',
  'shop.sellPrice': 'Preț de vânzare: {amount}',
  'shop.repairCost': 'Reparație: {amount}',
  'petInfo.tipLevel': 'Nivel : {level}',
  'petInfo.tipExperience': 'Experiență : {value}',
  'petInfo.tipLife': 'Viață : {current} / {max}',
  'item.equipped': 'Echipat',
} satisfies Partial<Record<keyof typeof en, string>>;
