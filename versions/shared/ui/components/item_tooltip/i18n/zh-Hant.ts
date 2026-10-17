/** zh-Hant text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': '價格：{amount}',
  'shop.noPrice': '未定價',
  'shop.priceTaxed': '價格：{taxed}（{base}）',
  'shop.sellPrice': '出售價格：{amount}',
  'shop.repairCost': '修理費：{amount}',
  'petInfo.tipLevel': '等級：{level}',
  'petInfo.tipExperience': '經驗值：{value}',
  'petInfo.tipLife': '生命值：{current} / {max}',
  'item.equipped': '已裝備',
} satisfies Partial<Record<keyof typeof en, string>>;
