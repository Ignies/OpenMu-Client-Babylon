/** French text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Prix : {amount}',
  'shop.noPrice': 'Aucun prix',
  'shop.priceTaxed': 'Prix : {taxed} ({base})',
  'shop.sellPrice': 'Prix de vente : {amount}',
  'shop.repairCost': 'Réparation : {amount}',
  'petInfo.tipLevel': 'Niveau : {level}',
  'petInfo.tipExperience': 'Expérience : {value}',
  'petInfo.tipLife': 'Vie : {current} / {max}',
  'item.equipped': 'Équipé',
} satisfies Partial<Record<keyof typeof en, string>>;
