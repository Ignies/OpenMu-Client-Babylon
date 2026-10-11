/** English text of the `inventory` window. See src/i18n/readme.md. */

const en = {
  'inventory.title': 'Inventory',
  'inventory.close': 'Close (I,V)',
  'inventory.repair': 'Repair (L)',
  'inventory.personalShop': 'Personal Shop',
  'inventory.expand': 'Open Expanded Inventory (K)',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/inventory': typeof en;
  }
}
