/** Vietnamese text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Giá: {amount}',
  'shop.noPrice': 'Chưa đặt giá',
  'shop.priceTaxed': 'Giá: {taxed} ({base})',
  'shop.sellPrice': 'Giá bán: {amount}',
  'shop.repairCost': 'Sửa: {amount}',
  'petInfo.tipLevel': 'Cấp : {level}',
  'petInfo.tipExperience': 'Kinh nghiệm : {value}',
  'petInfo.tipLife': 'Sinh lực : {current} / {max}',
  'item.equipped': 'Đang trang bị',
} satisfies Partial<Record<keyof typeof en, string>>;
