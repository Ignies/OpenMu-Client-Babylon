/** fa text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'قیمت: {amount}',
  'shop.noPrice': 'قیمتی تعیین نشده',
  'shop.priceTaxed': 'قیمت: {taxed} ({base})',
  'shop.sellPrice': 'قیمت فروش: {amount}',
  'shop.repairCost': 'تعمیر: {amount}',
  'petInfo.tipLevel': 'سطح : {level}',
  'petInfo.tipExperience': 'تجربه : {value}',
  'petInfo.tipLife': 'جان : {current} / {max}',
  'item.equipped': 'تجهیزشده',
} satisfies Partial<Record<keyof typeof en, string>>;
