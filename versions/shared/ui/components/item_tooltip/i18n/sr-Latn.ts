/** sr-Latn text of `versions/shared/ui/components/item_tooltip`. */

import type en from './en';

export default {
  'shop.price': 'Cena: {amount}',
  'shop.noPrice': 'Cena nije postavljena',
  'shop.priceTaxed': 'Cena: {taxed} ({base})',
  'shop.sellPrice': 'Prodajna cena: {amount}',
  'shop.repairCost': 'Popravka: {amount}',
  'petInfo.tipLevel': 'Nivo: {level}',
  'petInfo.tipExperience': 'Iskustvo: {value}',
  'petInfo.tipLife': 'Život: {current} / {max}',
  'item.equipped': 'Opremljeno',
} satisfies Partial<Record<keyof typeof en, string>>;
