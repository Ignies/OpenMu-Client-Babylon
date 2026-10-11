/** English text of the `item_tooltip` interface widget. See src/i18n/readme.md. */

const en = {
  'shop.price': 'Price: {amount}',
  'shop.noPrice': 'No price set',
  'shop.priceTaxed': 'Price: {taxed} ({base})',
  'shop.sellPrice': 'Sell price: {amount}',
  'shop.repairCost': 'Repair: {amount}',
  'petInfo.tipLevel': 'Level : {level}',
  'petInfo.tipExperience': 'Experience : {value}',
  'petInfo.tipLife': 'Life : {current} / {max}',
  'item.equipped': 'Equipped',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/components/item_tooltip': typeof en;
  }
}
