/** fil text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Presyo: {amount}',
  'shop.noPrice': 'Walang presyo',
  'shop.priceTaxed': 'Presyo: {taxed} ({base})',
  'shop.sellPrice': 'Presyo ng benta: {amount}',
  'shop.repairCost': 'Pag-aayos: {amount}',
  'petInfo.tipLevel': 'Level : {level}',
  'petInfo.tipExperience': 'EXP : {value}',
  'petInfo.tipLife': 'Buhay : {current} / {max}',
  'item.equipped': 'Naka-equip',
} satisfies Partial<Record<keyof typeof en, string>>;
