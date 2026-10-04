/** Polish text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Cena: {amount}',
  'shop.noPrice': 'Brak ceny',
  'shop.priceTaxed': 'Cena: {taxed} ({base})',
  'shop.sellPrice': 'Cena sprzedaży: {amount}',
  'shop.repairCost': 'Naprawa: {amount}',
  'petInfo.tipLevel': 'Poziom : {level}',
  'petInfo.tipExperience': 'Doświadczenie : {value}',
  'petInfo.tipLife': 'Życie : {current} / {max}',
  'item.equipped': 'Założony',
} satisfies Partial<Record<keyof typeof en, string>>;
