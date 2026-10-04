/** German text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Preis: {amount}',
  'shop.noPrice': 'Kein Preis gesetzt',
  'shop.priceTaxed': 'Preis: {taxed} ({base})',
  'shop.sellPrice': 'Verkaufspreis: {amount}',
  'shop.repairCost': 'Reparatur: {amount}',
  'petInfo.tipLevel': 'Level : {level}',
  'petInfo.tipExperience': 'Erfahrung : {value}',
  'petInfo.tipLife': 'Leben : {current} / {max}',
  'item.equipped': 'Getragen',
} satisfies Partial<Record<keyof typeof en, string>>;
