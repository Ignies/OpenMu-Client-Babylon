/** Korean text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': '가격: {amount}',
  'shop.noPrice': '가격 미설정',
  'shop.priceTaxed': '가격: {taxed} ({base})',
  'shop.sellPrice': '판매 가격: {amount}',
  'shop.repairCost': '수리: {amount}',
  'petInfo.tipLevel': '레벨 : {level}',
  'petInfo.tipExperience': '경험치 : {value}',
  'petInfo.tipLife': '생명력 : {current} / {max}',
  'item.equipped': '착용 중',
} satisfies Partial<Record<keyof typeof en, string>>;
