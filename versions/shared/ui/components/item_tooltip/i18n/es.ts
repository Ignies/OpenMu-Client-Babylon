/** Spanish text of the `item_tooltip` interface widget. */

import type en from './en';

export default {
  'shop.price': 'Precio: {amount}',
  'shop.noPrice': 'Sin precio',
  'shop.priceTaxed': 'Precio: {taxed} ({base})',
  'shop.sellPrice': 'Precio de venta: {amount}',
  'shop.repairCost': 'Reparación: {amount}',
  'petInfo.tipLevel': 'Nivel : {level}',
  'petInfo.tipExperience': 'Experiencia : {value}',
  'petInfo.tipLife': 'Vida : {current} / {max}',
  'item.equipped': 'Equipado',
} satisfies Partial<Record<keyof typeof en, string>>;
