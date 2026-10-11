/** Italian text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Prezzo: {amount}',
  'shop.noPrice': 'Nessun prezzo',
  'shop.priceTaxed': 'Prezzo: {taxed} ({base})',
  'shop.sellPrice': 'Prezzo di vendita: {amount}',
  'shop.repairCost': 'Riparazione: {amount}',
  'petInfo.tipLevel': 'Livello : {level}',
  'petInfo.tipExperience': 'Esperienza : {value}',
  'petInfo.tipLife': 'Vita : {current} / {max}',
  'item.equipped': 'Equipaggiato',
} satisfies Partial<Record<keyof typeof en, string>>;
