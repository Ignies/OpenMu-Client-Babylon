/** Thai text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'ราคา: {amount}',
  'shop.noPrice': 'ยังไม่ตั้งราคา',
  'shop.priceTaxed': 'ราคา: {taxed} ({base})',
  'shop.sellPrice': 'ราคาขาย: {amount}',
  'shop.repairCost': 'ซ่อม: {amount}',
  'petInfo.tipLevel': 'เลเวล : {level}',
  'petInfo.tipExperience': 'ค่าประสบการณ์ : {value}',
  'petInfo.tipLife': 'พลังชีวิต : {current} / {max}',
  'item.equipped': 'สวมใส่อยู่',
} satisfies Partial<Record<keyof typeof en, string>>;
