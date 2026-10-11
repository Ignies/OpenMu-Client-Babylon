/** Bulgarian text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Цена: {amount}',
  'shop.noPrice': 'Без цена',
  'shop.priceTaxed': 'Цена: {taxed} ({base})',
  'shop.sellPrice': 'Цена при продажба: {amount}',
  'shop.repairCost': 'Поправка: {amount}',
  'petInfo.tipLevel': 'Ниво : {level}',
  'petInfo.tipExperience': 'Опит : {value}',
  'petInfo.tipLife': 'Живот : {current} / {max}',
  'item.equipped': 'Носено',
} satisfies Partial<Record<keyof typeof en, string>>;
