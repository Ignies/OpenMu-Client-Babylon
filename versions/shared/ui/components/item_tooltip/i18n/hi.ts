/** hi text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'कीमत: {amount}',
  'shop.noPrice': 'कीमत तय नहीं',
  'shop.priceTaxed': 'कीमत: {taxed} ({base})',
  'shop.sellPrice': 'बिक्री कीमत: {amount}',
  'shop.repairCost': 'मरम्मत: {amount}',
  'petInfo.tipLevel': 'लेवल : {level}',
  'petInfo.tipExperience': 'अनुभव : {value}',
  'petInfo.tipLife': 'जीवन : {current} / {max}',
  'item.equipped': 'पहना हुआ',
} satisfies Partial<Record<keyof typeof en, string>>;
