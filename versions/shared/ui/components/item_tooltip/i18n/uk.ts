/** uk text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Ціна: {amount}',
  'shop.noPrice': 'Ціну не встановлено',
  'shop.priceTaxed': 'Ціна: {taxed} ({base})',
  'shop.sellPrice': 'Ціна продажу: {amount}',
  'shop.repairCost': 'Ремонт: {amount}',
  'petInfo.tipLevel': 'Рівень: {level}',
  'petInfo.tipExperience': 'Досвід: {value}',
  'petInfo.tipLife': 'Здоров’я: {current} / {max}',
  'item.equipped': 'Вдягнуто',
} satisfies Partial<Record<keyof typeof en, string>>;
