/** Chinese text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': '价格：{amount}',
  'shop.noPrice': '未定价',
  'shop.priceTaxed': '价格：{taxed}（{base}）',
  'shop.sellPrice': '出售价格：{amount}',
  'shop.repairCost': '修理：{amount}',
  'petInfo.tipLevel': '等级 : {level}',
  'petInfo.tipExperience': '经验 : {value}',
  'petInfo.tipLife': '生命 : {current} / {max}',
  'item.equipped': '已装备',
} satisfies Partial<Record<keyof typeof en, string>>;
