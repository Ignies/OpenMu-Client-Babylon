/** Russian text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Цена: {amount}',
  'shop.noPrice': 'Цена не задана',
  'shop.priceTaxed': 'Цена: {taxed} ({base})',
  'shop.sellPrice': 'Цена продажи: {amount}',
  'shop.repairCost': 'Починка: {amount}',
  'petInfo.tipLevel': 'Уровень : {level}',
  'petInfo.tipExperience': 'Опыт : {value}',
  'petInfo.tipLife': 'Жизнь : {current} / {max}',
  'item.equipped': 'Надето',
} satisfies Partial<Record<keyof typeof en, string>>;
