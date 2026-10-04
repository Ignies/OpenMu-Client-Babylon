/** Japanese text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': '価格: {amount}',
  'shop.noPrice': '価格未設定',
  'shop.priceTaxed': '価格: {taxed}（{base}）',
  'shop.sellPrice': '売却価格: {amount}',
  'shop.repairCost': '修理: {amount}',
  'petInfo.tipLevel': 'レベル : {level}',
  'petInfo.tipExperience': '経験値 : {value}',
  'petInfo.tipLife': 'ライフ : {current} / {max}',
  'item.equipped': '装備中',
} satisfies Partial<Record<keyof typeof en, string>>;
